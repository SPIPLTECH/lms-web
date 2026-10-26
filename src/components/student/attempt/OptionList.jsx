"use client";

import { motion } from "framer-motion";

const getOptionText = (opt) => {
  if (opt === null || opt === undefined) return "";
  if (typeof opt === "string") return opt;
  if (typeof opt === "object") return opt.optionText || opt.text || JSON.stringify(opt);
  return String(opt);
};

export default function OptionList({
  options = [],
  selectedAnswer,
  onSelect,
}) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      {options.map((option, index) => {
        const optionText = getOptionText(option);
        const isSelected = selectedAnswer === optionText || selectedAnswer === option;

        return (
          <motion.button
            key={index}
            type="button"
            onClick={() => onSelect(optionText)}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`
              relative
              flex
              w-full
              items-center
              gap-2
              sm:gap-2.5
              rounded-lg
              sm:rounded-xl
              border
              py-1.5
              px-2.5
              sm:py-2.5
              sm:px-3
              min-h-[38px]
              sm:min-h-[44px]
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
            {/* Background selection glow gradient */}
            {isSelected && (
              <motion.div
                layoutId="activeOptionGlow"
                className="absolute inset-0 rounded-lg sm:rounded-2xl bg-gradient-to-r from-orange-500/5 to-pink-500/5 -z-10 pointer-events-none"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}

            {/* Radio Indicator */}
            <div
              className={`
                flex
                h-3.5
                w-3.5
                sm:h-4
                sm:w-4
                shrink-0
                items-center
                justify-center
                rounded-full
                border-2
                transition-all
                duration-300
                ${
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-transparent"
                }
              `}
            >
              {isSelected && (
                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white" />
              )}
            </div>

            {/* Option Label (A, B, C, D) */}
            <div
              className={`
                flex
                h-5
                w-5
                sm:h-7
                sm:w-7
                shrink-0
                items-center
                justify-center
                rounded-md
                sm:rounded-xl
                font-extrabold
                text-[11px]
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
                className={`text-xs sm:text-base leading-snug break-words transition-colors duration-200 ${
                  isSelected
                    ? "font-semibold text-foreground"
                    : "text-slate-400"
                }`}
              >
                {optionText}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}