import React, { useState } from "react";
import { FolderGit2, Link2, Plus, Save } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DefaultTone } from "@/types";
import { defaultToneSchema } from "@/types";

const TONE_LABELS: Record<DefaultTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  hype: "Hype",
  indie_devlog: "Indie devlog",
  technical: "Technical",
};

export interface ProjectFormValues {
  name?: string;
  description?: string | null;
  repo_url?: string | null;
  default_tone?: DefaultTone | null;
}

interface ProjectFormProps {
  action: string;
  method?: "POST";
  defaultValues?: ProjectFormValues;
  errorMessage?: string | null;
  submitLabel?: string;
  pendingText?: string;
  hiddenFields?: Record<string, string>;
}

export default function ProjectForm({
  action,
  method = "POST",
  defaultValues,
  errorMessage,
  submitLabel = "Create project",
  pendingText = "Saving...",
  hiddenFields,
}: ProjectFormProps) {
  const isUpdate = hiddenFields?._action === "update";
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [repoUrl, setRepoUrl] = useState(defaultValues?.repo_url ?? "");
  const [defaultTone, setDefaultTone] = useState(defaultValues?.default_tone ?? "");
  const [nameError, setNameError] = useState<string | undefined>();

  function validate() {
    if (!name.trim()) {
      setNameError("Project name is required");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  return (
    <form method={method} action={action} className="space-y-4" onSubmit={handleSubmit} noValidate>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([fieldName, value]) => (
          <input key={fieldName} type="hidden" name={fieldName} value={value} />
        ))}

      <FormField
        id="name"
        label="Project name"
        value={name}
        onChange={(value) => {
          setName(value);
          if (nameError) setNameError(undefined);
        }}
        placeholder="Scrapwars"
        error={nameError}
        icon={<FolderGit2 className="size-4" />}
      />

      <div>
        <Label htmlFor="description" className="mb-1 block text-blue-100/80">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          placeholder="What is this game about?"
          rows={4}
          className={cn(
            "rounded-lg border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-purple-400",
          )}
        />
      </div>

      <FormField
        id="repo_url"
        name="repo_url"
        label="Repository URL"
        type="url"
        value={repoUrl}
        onChange={setRepoUrl}
        placeholder="https://github.com/org/repo"
        icon={<Link2 className="size-4" />}
      />

      <div>
        <Label htmlFor="default_tone" className="mb-1 block text-blue-100/80">
          Default tone
        </Label>
        <Select
          id="default_tone"
          name="default_tone"
          value={defaultTone}
          onChange={(e) => {
            setDefaultTone(e.target.value);
          }}
          className="rounded-lg border-white/20 bg-white/10 text-white focus-visible:ring-purple-400"
        >
          <option value="">No default</option>
          {defaultToneSchema.options.map((tone) => (
            <option key={tone} value={tone} className="bg-slate-900 text-white">
              {TONE_LABELS[tone]}
            </option>
          ))}
        </Select>
      </div>

      <ServerError message={errorMessage} />

      <SubmitButton
        pendingText={pendingText}
        icon={isUpdate ? <Save className="size-4" /> : <Plus className="size-4" />}
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
