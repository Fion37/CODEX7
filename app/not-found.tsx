import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty">
      <h1>这页还没有学习内容</h1>
      <p>回到今天，从一个小练习开始。</p>
      <Link className="button primary" href="/">
        返回学习概览
      </Link>
    </section>
  );
}
