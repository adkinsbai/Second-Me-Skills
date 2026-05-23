import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell flex flex-col items-center justify-center px-4">
      <p className="mb-2 text-xl font-medium text-gray-900">页面不存在</p>
      <p className="mb-6 luxury-subtitle">请检查链接或返回首页</p>
      <Link href="/" className="luxury-btn rounded-xl px-5 py-2.5 text-sm font-semibold">
        返回首页
      </Link>
    </main>
  );
}
