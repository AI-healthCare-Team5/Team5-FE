import { useId, useState } from "react";
import { Button, Card } from "@/components/ui";
import type { SummaryContent } from "@/components/summary/types";
import {
  canSaveEdits,
  editMaxLength,
  initialEdits,
  type SummaryEdits,
} from "@/pages/summary/editSummary";

const inputClass =
  "min-h-[max(44px,3.2rem)] w-full rounded-[16px] border border-control bg-surface px-4 py-3 placeholder:text-subtle";

function Field({
  label,
  value,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <input
        id={id}
        value={value}
        required={required}
        maxLength={editMaxLength}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </div>
  );
}

// 안내된 진료과는 고칠 수 없어서 읽기만 합니다.
export function SummaryEditForm({
  summary,
  onSave,
  onCancel,
}: {
  summary: SummaryContent;
  onSave: (edits: SummaryEdits) => void;
  onCancel: () => void;
}) {
  const [edits, setEdits] = useState(() => initialEdits(summary));
  return (
    <Card className="flex flex-col gap-5">
      <Field
        label="주된 증상"
        value={edits.mainSymptom}
        required
        onChange={(mainSymptom) => setEdits({ ...edits, mainSymptom })}
      />
      <Field
        label="언제부터"
        value={edits.onsetDetail}
        onChange={(onsetDetail) => setEdits({ ...edits, onsetDetail })}
      />
      {summary.items.map((item) => (
        <Field
          key={item.order}
          label={item.label}
          value={edits.itemValues[item.order] ?? ""}
          onChange={(value) =>
            setEdits({
              ...edits,
              itemValues: { ...edits.itemValues, [item.order]: value },
            })
          }
        />
      ))}
      <dl>
        <dt className="mb-1 text-[0.889rem] font-medium text-subtle">
          안내된 진료과
        </dt>
        <dd className="font-bold text-brand-strong">
          {summary.department?.departmentName ?? "확인 못 했어요"}
        </dd>
      </dl>
      <div className="flex flex-col gap-3">
        <Button disabled={!canSaveEdits(edits)} onClick={() => onSave(edits)}>
          저장하기
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </Card>
  );
}
