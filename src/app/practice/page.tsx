import { redirect } from 'next/navigation';

/** /practice 本身没有可渲染内容，直接送到默认方向 */
export default function PracticeIndexPage() {
  redirect('/practice/en-zh');
}
