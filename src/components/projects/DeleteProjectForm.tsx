import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteProjectFormProps {
  action: string;
}

export default function DeleteProjectForm({ action }: DeleteProjectFormProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form method="POST" action={action} className="space-y-4">
      <input type="hidden" name="_action" value="delete" />

      <p className="text-sm text-blue-100/70">
        Deleting this project permanently removes it and all related change inputs, generation runs, and drafts. This
        cannot be undone.
      </p>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-blue-100/80">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => {
            setConfirmed(e.target.checked);
          }}
          className="mt-0.5 size-4 rounded border-white/30 bg-white/10"
        />
        I understand this will permanently delete this project and all related data
      </label>

      <Button
        type="submit"
        disabled={!confirmed}
        variant="destructive"
        className="rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40"
      >
        <Trash2 className="size-4" />
        Delete project
      </Button>
    </form>
  );
}
