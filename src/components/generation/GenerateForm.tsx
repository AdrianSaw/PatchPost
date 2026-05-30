import React, { useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { ServerError } from "@/components/auth/ServerError";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createChangeInput, runGeneration } from "@/lib/generation/client-api";
import { OUTPUT_TYPE_OPTIONS, TONE_OPTIONS } from "@/lib/generation/labels";
import { cn } from "@/lib/utils";
import type { DefaultTone, OutputType } from "@/types";

interface GenerateFormProps {
  projectId: string;
  defaultTone?: DefaultTone | null;
  initialError?: string | null;
  showDevMockToggle?: boolean;
}

export default function GenerateForm({
  projectId,
  defaultTone = null,
  initialError = null,
  showDevMockToggle = false,
}: GenerateFormProps) {
  const [title, setTitle] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("changelog");
  const [tone, setTone] = useState(defaultTone ?? "");
  const [useDevMockProvider, setUseDevMockProvider] = useState(showDevMockToggle);
  const [rawContentError, setRawContentError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    if (!rawContent.trim()) {
      setRawContentError("Paste at least one change or commit message");
      return false;
    }
    setRawContentError(undefined);
    return true;
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const trimmedTitle = title.trim();
    const changeInputResult = await createChangeInput(projectId, {
      title: trimmedTitle || null,
      raw_content: rawContent.trim(),
    });

    if (!changeInputResult.ok) {
      setSubmitError(changeInputResult.message);
      setIsSubmitting(false);
      return;
    }

    const generationResult = await runGeneration(
      projectId,
      {
        change_input_id: changeInputResult.data.changeInput.id,
        output_type: outputType,
        ...(tone ? { tone: tone as DefaultTone } : {}),
      },
      { useDevMockProvider: showDevMockToggle && useDevMockProvider },
    );

    if (!generationResult.ok) {
      setSubmitError(generationResult.message);
      setIsSubmitting(false);
      return;
    }

    window.location.assign(`/app/projects/${projectId}/drafts?success=generated`);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="title"
        label="Title (optional)"
        value={title}
        onChange={setTitle}
        placeholder="Patch 1.2"
        icon={<FileText className="size-4" />}
      />

      <div>
        <Label htmlFor="raw_content" className="mb-1 block text-blue-100/80">
          Changes
        </Label>
        <p className="mb-2 text-xs text-blue-100/50">Paste commit messages or bullet points, one per line.</p>
        <Textarea
          id="raw_content"
          name="raw_content"
          value={rawContent}
          onChange={(event) => {
            setRawContent(event.target.value);
            if (rawContentError) {
              setRawContentError(undefined);
            }
          }}
          placeholder={"fix: collision in level 3\nfeat: new boss fight"}
          rows={8}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-purple-400",
            rawContentError && "border-red-400/60 focus-visible:ring-red-400",
          )}
        />
        {rawContentError ? <p className="mt-1 text-xs text-red-300">{rawContentError}</p> : null}
      </div>

      <div>
        <Label htmlFor="output_type" className="mb-1 block text-blue-100/80">
          Output channel
        </Label>
        <Select
          id="output_type"
          name="output_type"
          value={outputType}
          disabled={isSubmitting}
          onChange={(event) => {
            setOutputType(event.target.value as OutputType);
          }}
          className="rounded-lg border-white/20 bg-white/10 text-white focus-visible:ring-purple-400"
        >
          {OUTPUT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-white">
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="tone" className="mb-1 block text-blue-100/80">
          Tone (optional)
        </Label>
        <Select
          id="tone"
          name="tone"
          value={tone}
          disabled={isSubmitting}
          onChange={(event) => {
            setTone(event.target.value);
          }}
          className="rounded-lg border-white/20 bg-white/10 text-white focus-visible:ring-purple-400"
        >
          <option value="">Project default</option>
          {TONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-white">
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {showDevMockToggle ? (
        <label className="flex items-center gap-2 text-sm text-blue-100/70">
          <input
            type="checkbox"
            checked={useDevMockProvider}
            onChange={(event) => {
              setUseDevMockProvider(event.target.checked);
            }}
            disabled={isSubmitting}
            className="rounded border-white/30 bg-white/10"
          />
          Use mock AI provider (dev only)
        </label>
      ) : null}

      <ServerError message={submitError} />

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-500"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles className="size-4" />
            Generate draft
          </span>
        )}
      </Button>
    </form>
  );
}
