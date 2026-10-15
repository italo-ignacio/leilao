"use client";

import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { mutateRecordAction } from "@/app/admin/record-actions";
import { ConfirmButton } from "./confirm-button";

export function RecordControls({
  kind,
  id,
  version,
  archived,
  canDelete = false,
  disabled = false,
}: {
  kind: "auction" | "lot" | "category";
  id: string;
  version: string;
  archived: boolean;
  canDelete?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  async function mutate(operation: "archive" | "restore" | "delete") {
    const result = await mutateRecordAction(kind, { id, version, operation });
    if (!result.ok) return result.error;
    router.refresh();
    return null;
  }
  const label =
    kind === "category"
      ? archived
        ? "Ativar categoria"
        : "Desativar categoria"
      : archived
        ? "Restaurar registro"
        : "Arquivar registro";
  return (
    <div className="flex items-center gap-1">
      <ConfirmButton
        label={label}
        title={`${label}?`}
        disabled={disabled}
        onConfirm={() => mutate(archived ? "restore" : "archive")}
      >
        {archived ? (
          <RotateCcw aria-hidden="true" />
        ) : (
          <Archive aria-hidden="true" />
        )}
      </ConfirmButton>
      {kind === "category" && (
        <ConfirmButton
          label="Excluir categoria"
          title="Excluir definitivamente esta categoria?"
          disabled={!canDelete}
          onConfirm={() => mutate("delete")}
        >
          <Trash2 aria-hidden="true" />
        </ConfirmButton>
      )}
    </div>
  );
}
