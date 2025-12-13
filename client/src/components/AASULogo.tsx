import { motion } from "framer-motion";
// Use the favicon as the logo
const aasuLogoImage = "/favicon.png";

interface AASULogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}

export function AASULogo({
  size = "md",
  animated = true,
  className = "",
}: AASULogoProps) {
  const sizeMap = {
    sm: { container: "w-10 h-10", text: "text-xs" },
    md: { container: "w-16 h-16", text: "text-sm" },
    lg: { container: "w-24 h-24", text: "text-base" },
    xl: { container: "w-32 h-32", text: "text-lg" },
  };

  const { container } = sizeMap[size];

  if (animated) {
    return (
      <motion.div
        className={`${container} ${className}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <img
          src={aasuLogoImage}
          alt="AASU Logo"
          className="w-full h-full object-contain"
        />
      </motion.div>
    );
  }

  return (
    <div className={`${container} ${className}`}>
      <img
        src={aasuLogoImage}
        alt="AASU Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export function AASULogoText({
  animated = true,
  className = "",
}: {
  animated?: boolean;
  className?: string;
}) {
  const letterVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
    }),
  };

  const letters = "AASU".split("");

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          custom={i}
          variants={animated ? letterVariants : undefined}
          initial={animated ? "hidden" : undefined}
          animate={animated ? "visible" : undefined}
          className="text-4xl font-bold"
          style={{
            background:
              "linear-gradient(135deg, #0e1c43 0%, #60c2ac 50%, #fbb216 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {letter}
        </motion.span>
      ))}
    </div>
  );
}

export function AASUFullLogo({
  animated = true,
  className = "",
}: {
  animated?: boolean;
  className?: string;
}) {
  if (animated) {
    return (
      <motion.div
        className={`w-48 h-48 ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src={aasuLogoImage}
          alt="Abdullah Al Salem University"
          className="w-full h-full object-contain"
        />
      </motion.div>
    );
  }

  return (
    <div className={`w-48 h-48 ${className}`}>
      <img
        src={aasuLogoImage}
        alt="Abdullah Al Salem University"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
