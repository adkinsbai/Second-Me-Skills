import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  rateLimitResponse,
  withCors,
  handleCorsPreflightRequest,
} from "@/lib/api-security";
import {
  uploadImage,
  isR2Configured,
  keyFromUrl,
  deleteImage,
} from "@/lib/storage";

// 5 MB hard limit (before any server-side compression)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const VALID_TYPES = ["avatar", "photo1", "photo2", "photo3"] as const;
type ImageType = (typeof VALID_TYPES)[number];

/** Map upload type to the Prisma column to update. */
const TYPE_TO_FIELD: Record<ImageType, string> = {
  avatar: "avatarUrl",
  photo1: "photo1",
  photo2: "photo2",
  photo3: "photo3",
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request) ?? NextResponse.next();
}

/**
 * POST /api/user/upload
 * multipart/form-data: file (image), type (avatar|photo1|photo2|photo3)
 *
 * When R2 is configured: uploads to R2 and stores the URL.
 * When R2 is NOT configured: falls back to storing a base64 data URL directly
 * in the database (backward-compatible dev mode).
 */
export async function POST(request: NextRequest) {
  const corsPreflight = handleCorsPreflightRequest(request);
  if (corsPreflight) return corsPreflight;

  // Auth
  const user = await getCurrentUser();
  if (!user) {
    return withCors(
      NextResponse.json({ code: 401, message: "未登录" }, { status: 401 }),
      request.headers.get("origin")
    );
  }

  // Rate limit: 30 uploads per 10 min
  const rl = rateLimitResponse(request, "image-upload", 30, 10 * 60 * 1000);
  if (rl) return rl;

  // Parse form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return withCors(
      NextResponse.json({ code: 400, message: "无效的表单数据" }, { status: 400 }),
      request.headers.get("origin")
    );
  }

  const file = formData.get("file");
  const typeRaw = formData.get("type");

  if (!file || !(file instanceof File)) {
    return withCors(
      NextResponse.json({ code: 400, message: "缺少图片文件" }, { status: 400 }),
      request.headers.get("origin")
    );
  }

  const type = typeof typeRaw === "string" ? typeRaw.trim() : "";
  if (!VALID_TYPES.includes(type as ImageType)) {
    return withCors(
      NextResponse.json(
        { code: 400, message: `无效的 type，允许: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      ),
      request.headers.get("origin")
    );
  }

  // Validate mime type
  if (!ALLOWED_MIME.has(file.type)) {
    return withCors(
      NextResponse.json(
        { code: 400, message: "不支持的图片格式，请使用 JPG/PNG/WebP/GIF" },
        { status: 400 }
      ),
      request.headers.get("origin")
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return withCors(
      NextResponse.json(
        { code: 400, message: `图片不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      ),
      request.headers.get("origin")
    );
  }

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine content type & extension
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const contentType = file.type;

  if (isR2Configured()) {
    // ── R2 upload path ────────────────────────────────────────────────────
    // Delete old image if it was on R2
    const oldUrl = await getOldUrl(user.id, type as ImageType);
    if (oldUrl) {
      const oldKey = keyFromUrl(oldUrl);
      if (oldKey) {
        await deleteImage(oldKey).catch(() => {});
      }
    }

    const key = `users/${user.id}/${type}.${ext}`;
    const url = await uploadImage(buffer, key, contentType);

    // Update user record
    await prisma.user.update({
      where: { id: user.id },
      data: { [TYPE_TO_FIELD[type as ImageType]]: url },
    });

    return withCors(
      NextResponse.json({ code: 0, data: { url } }),
      request.headers.get("origin")
    );
  } else {
    // ── Fallback: base64 data URL (dev without R2) ────────────────────────
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { [TYPE_TO_FIELD[type as ImageType]]: dataUrl },
    });

    return withCors(
      NextResponse.json({ code: 0, data: { url: dataUrl } }),
      request.headers.get("origin")
    );
  }
}

/** Helper: read the current value for a given image type from the DB. */
async function getOldUrl(
  userId: string,
  type: ImageType
): Promise<string | null> {
  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true, photo1: true, photo2: true, photo3: true },
  });
  if (!fullUser) return null;
  const field = TYPE_TO_FIELD[type];
  if (field === "avatarUrl") return fullUser.avatarUrl ?? null;
  if (field === "photo1") return fullUser.photo1 ?? null;
  if (field === "photo2") return fullUser.photo2 ?? null;
  if (field === "photo3") return fullUser.photo3 ?? null;
  return null;
}
