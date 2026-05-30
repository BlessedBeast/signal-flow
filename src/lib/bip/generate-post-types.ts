import type { FrameworkStepTracking } from "@/lib/signalflow-types";

export type BipGeneratePostSuccess = {
  ok: true;
  framework_slug: string;
  framework_title: string;
  draft_text: string;
  media_directives: string[];
  playbook_step: number;
  next_playbook_step: number;
  framework_step_tracking: FrameworkStepTracking;
};

export type BipGeneratePostError = {
  ok: false;
  error: string;
  step: string | null;
};

export type BipGeneratePostResponse =
  | BipGeneratePostSuccess
  | BipGeneratePostError;
