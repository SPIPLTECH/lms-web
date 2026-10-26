"use client";

import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getOptionText = (opt) => {
  if (opt === null || opt === undefined) return "";
  if (typeof opt === "string") return opt;
  if (typeof opt === "object") return opt.optionText || opt.text || JSON.stringify(opt);
  return String(opt);
};

export default function MCQMultiOptionList({
  options = [],
  selectedAnswers = [],
  onSelect,
}) {
  const handleToggle = (optionText) => {
    let newAnswers;
    if (selectedAnswers.includes(optionText)) {
      newAnswers = selectedAnswers.filter((ans) => ans !== optionText);
    } else {
      newAnswers = [...selectedAnswers, optionText];
    }
    onSelect(newAnswers);
  };

  return (
    <div className="space-y-1.5 sm:space-y-4">
      {/* Top Banner Alert / Instruction */}
      <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-1.5 sm:px-4 sm:py-3 text-[11px] sm:text-xs text-primary font-semibold mb-2 sm:mb-4">
        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span>Multiple Choice: Select all options that apply to this question.</span>
      </div>

      {options.map((option, index) => {
        const optionText = getOptionText(option);
        const isSelected = selectedAnswers.includes(optionText) || selectedAnswers.includes(option);

        return (
          <motion.button
            key={index}
            type="button"
            onClick={() => handleToggle(optionText)}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`
              relative
              flex
              w-full
              items-center
              gap-2
              sm:gap-4
              rounded-xl
              sm:rounded-2xl
              border
              py-1.5
              px-2.5
              sm:p-5
              min-h-[38px]
              sm:min-h-[50px]
              text-left
              cursor-pointer
              transition-all
              duration-300
              ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                  : "border-border bg-background/60 hover:border-primary/30 hover:bg-muted/80 hover:shadow-lg"
              }
            `}
          >
            {/* Glow effect */}
            {isSelected && (
              <motion.div
                layoutId="activeMultiOptionGlow"
                className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500/5 to-pink-500/5 -z-10 pointer-events-none"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}

            {/* Option Index Label (A, B, C, D) */}
            <div
              className={`
                flex
                h-6
                w-6
                sm:h-10
                sm:w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                sm:rounded-xl
                font-extrabold
                text-xs
                sm:text-sm
                transition-all
                duration-300
                ${
                  isSelected
                    ? "bg-primary text-foreground shadow-md shadow-orange-500/20"
                    : "bg-muted text-muted-foreground border border-transparent/50"
                }
              `}
            >
              {String.fromCharCode(65 + index)}
            </div>

            {/* Option Text */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs sm:text-base leading-snug sm:leading-relaxed break-words transition-colors duration-200 ${
                  isSelected
                    ? "font-semibold text-foreground"
                    : "text-slate-400"
                }`}
              >
                {optionText}
              </p>
            </div>

            {/* Checkbox indicator */}
            <div className="flex items-center self-center shrink-0">
              <AnimatePresence mode="wait">
                {isSelected ? (
                  <motion.div
                    key="checked"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    className="flex h-4 w-4 sm:h-6 sm:w-6 items-center justify-center rounded-md sm:rounded-lg bg-primary text-foreground shadow-md shadow-orange-500/25"
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 stroke-[3.5]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="unchecked"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="h-4 w-4 sm:h-6 sm:w-6 rounded-md sm:rounded-lg border border-slate-700 bg-background/40 hover:border-primary/50 transition-colors"
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
