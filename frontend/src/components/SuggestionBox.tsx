import { FormEvent, useState } from "react";
import { suggestionApi } from "../api/client";

export default function SuggestionBox() {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const maxLength = 140;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmed = content.trim();
    if (trimmed.length < 4) {
      setFeedback({
        kind: "error",
        message: "Suggestion must be at least 4 characters.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      await suggestionApi.create(trimmed);
      setContent("");
      setFeedback({
        kind: "success",
        message: "Suggestion saved for manual review. Thank you!",
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Could not save your suggestion right now.";
      setFeedback({ kind: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
      <h3 className="mb-2 text-lg font-bold text-[#f4f7fb]">
        Suggest a Baengo Item
      </h3>
      <p className="mb-4 text-sm text-[#b8c0ca]">
        Have a good idea? Send it in and it will be reviewed manually.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="baengo-suggestion" className="sr-only">
          Baengo item suggestion
        </label>
        <textarea
          id="baengo-suggestion"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={maxLength}
          rows={3}
          placeholder="Example: Someone says 'Can you hear me?' three times in one call"
          className="w-full resize-none rounded-lg border border-white/15 bg-[#151b23] px-3 py-2 text-sm text-[#e8edf2] placeholder:text-[#8a94a3] outline-none transition-colors focus:border-[#ff8a2a]/70"
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9ca6b2]">
            {content.length}/{maxLength}
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-gradient-to-r from-[#ff8a2a] to-[#ff5a2a] px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Submit Idea"}
          </button>
        </div>
      </form>

      {feedback && (
        <p
          className={`mt-3 text-sm ${
            feedback.kind === "success" ? "text-[#8de39f]" : "text-[#ff9d9d]"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
