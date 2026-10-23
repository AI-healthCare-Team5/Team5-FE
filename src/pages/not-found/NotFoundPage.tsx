import { ActionLink, PageTitle } from "@/components/ui";

export function NotFoundPage() {
  return (
    <>
      <PageTitle eyebrow="404" description="주소를 다시 확인해 주세요.">
        페이지를 찾을 수 없어요
      </PageTitle>
      <ActionLink to="/">처음으로</ActionLink>
    </>
  );
}
