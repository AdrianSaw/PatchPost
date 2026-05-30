import React, { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { revertDraftToOriginal, updateDraftBody } from "@/lib/projects/draft-client-api";
import { cn } from "@/lib/utils";

interface DraftEditFormProps {
  projectId: string;
  draftId: string;
  initialBody: string;
  showRevert: boolean;
}

export default function DraftEditForm({ projectId, draftId, initialBody, showRevert }: DraftEditFormProps) {
  const [body, setBody] = useState(initialBody);
  const [bodyError, setBodyError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty = body !== initialBody;

  function validate(): boolean {
    if (!body.trim()) {
      setBodyError("Draft body cannot be empty");
      return false;
    }
    setBodyError(undefined);
    return true;
  }

  function handleCancel() {
    window.location.assign(`/app/projects/${projectId}/drafts`);
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await updateDraftBody(projectId, draftId, body.trim());
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }

      window.location.assign(`/app/projects/${projectId}/drafts?success=saved`);
    } catch {
      setSubmitError("Something went wrong. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevert() {
    if (!window.confirm("Revert to the original AI-generated text? Your edits will be lost.")) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await revertDraftToOriginal(projectId, draftId);
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }

      window.location.assign(`/app/projects/${projectId}/drafts?success=reverted`);
    } catch {
      setSubmitError("Something went wrong. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <Label htmlFor="draft_body" className="mb-1 block text-blue-100/80">
          Draft content
        </Label>
        <Textarea
          id="draft_body"
          name="draft_body"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (bodyError) {
              setBodyError(undefined);
            }
          }}
          rows={16}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg border-white/20 bg-white/10 font-sans text-sm leading-relaxed text-white placeholder:text-white/40 focus-visible:ring-purple-400",
            bodyError && "border-red-400/60 focus-visible:ring-red-400",
          )}
        />
        {bodyError ? <p className="mt-1 text-xs text-red-300">{bodyError}</p> : null}
      </div>

      <ServerError message={submitError} />

      <div className="flex flex-wrap gap-3">
        <SubmitButton
          pending={isSubmitting}
          pendingText="Saving..."
          icon={<Save className="size-4" />}
          disabled={!isDirty}
          className="w-auto"
        >
          Save changes
        </SubmitButton>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={handleCancel}
          className="rounded-lg border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          Cancel
        </Button>
        {showRevert ? (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleRevert}
            className="rounded-lg border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <RotateCcw className="mr-2 size-4" />
            Revert to original
          </Button>
        ) : null}
      </div>
    </form>
  );
}
