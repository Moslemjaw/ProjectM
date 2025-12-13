import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Users,
  BarChart3,
  Zap,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Building2,
  FlaskConical,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { AASULogo, AASUFullLogo } from "@/components/AASULogo";

const navyBlue = "#0e1c43";
const teal = "#00b8a9";
const orange = "#f9a825";

function SharpSquare({
  size = 40,
  color = "navy",
  className = "",
}: {
  size?: number;
  color?: "navy" | "orange" | "teal";
  className?: string;
}) {
  const colors = { navy: navyBlue, orange: orange, teal: teal };
  return (
    <div
      className={className}
      style={{ width: size, height: size, backgroundColor: colors[color] }}
    />
  );
}

function PlusShape({
  size = 80,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const blockSize = size / 2;
  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: blockSize,
          height: blockSize,
          backgroundColor: navyBlue,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: blockSize,
          height: blockSize,
          backgroundColor: navyBlue,
        }}
      />
    </div>
  );
}

function DiagonalSquares({
  size = 70,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const blockSize = size / 2;
  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: blockSize,
          height: blockSize,
          backgroundColor: navyBlue,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: blockSize,
          height: blockSize,
          backgroundColor: navyBlue,
        }}
      />
    </div>
  );
}

function Diamond({
  color,
  size = 30,
  className = "",
}: {
  color: "teal" | "orange" | "navy";
  size?: number;
  className?: string;
}) {
  const colors = { teal: teal, orange: orange, navy: navyBlue };
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: colors[color],
        transform: "rotate(45deg)",
      }}
    />
  );
}

function Triangle({
  size = 30,
  color = "teal",
  direction = "down",
  className = "",
}: {
  size?: number;
  color?: "teal" | "navy" | "orange";
  direction?: "down" | "up" | "left" | "right";
  className?: string;
}) {
  const colors = { teal: teal, navy: navyBlue, orange: orange };
  const triangleColor = colors[color];

  const styles: Record<string, React.CSSProperties> = {
    down: {
      width: 0,
      height: 0,
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderTop: `${size}px solid ${triangleColor}`,
    },
    up: {
      width: 0,
      height: 0,
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderBottom: `${size}px solid ${triangleColor}`,
    },
    right: {
      width: 0,
      height: 0,
      borderTop: `${size / 2}px solid transparent`,
      borderBottom: `${size / 2}px solid transparent`,
      borderLeft: `${size}px solid ${triangleColor}`,
    },
    left: {
      width: 0,
      height: 0,
      borderTop: `${size / 2}px solid transparent`,
      borderBottom: `${size / 2}px solid transparent`,
      borderRight: `${size}px solid ${triangleColor}`,
    },
  };

  return <div className={className} style={styles[direction]} />;
}

export default function Landing() {
  const [, setLocation] = useLocation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0e1c43]/5 via-background to-[#00b8a9]/5 animate-gradient-shift"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00b8a9]/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#f9a825]/10 rounded-full blur-[100px] animate-pulse-slower"></div>

      {/* AASU Brand Shapes - Scattered across the entire page */}

      {/* Scattered shapes - distributed randomly across the page */}
      <motion.div
        className="absolute top-[8%] left-[12%] opacity-70"
        animate={{ y: [0, -6, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <PlusShape size={70} />
      </motion.div>

      <motion.div
        className="absolute top-[15%] left-[28%] opacity-80"
        animate={{ rotate: [45, 50, 45], y: [0, 5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Diamond color="teal" size={18} />
      </motion.div>

      <motion.div
        className="absolute top-[22%] left-[6%] opacity-60"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={22} color="teal" direction="right" />
      </motion.div>

      <motion.div
        className="absolute top-[18%] right-[15%] opacity-65"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={24} color="navy" direction="left" />
      </motion.div>

      <motion.div
        className="absolute top-[12%] right-[8%] opacity-70"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <PlusShape size={60} />
      </motion.div>

      <motion.div
        className="absolute top-[25%] right-[22%] opacity-60"
        animate={{ rotate: [45, 50, 45], y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Diamond color="orange" size={24} />
      </motion.div>

      <motion.div
        className="absolute top-[32%] left-[18%] opacity-55"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={30} color="navy" direction="right" />
      </motion.div>

      <motion.div
        className="absolute top-[38%] left-[35%] opacity-60"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <SharpSquare size={28} color="orange" />
      </motion.div>

      <motion.div
        className="absolute top-[42%] right-[12%] opacity-55"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={30} color="navy" direction="left" />
      </motion.div>

      <motion.div
        className="absolute top-[35%] right-[6%] opacity-55"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <PlusShape size={60} />
      </motion.div>

      <motion.div
        className="absolute top-[48%] left-[8%] opacity-60"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <DiagonalSquares size={60} />
      </motion.div>

      <motion.div
        className="absolute top-[52%] left-[42%] opacity-55"
        animate={{ rotate: [45, 52, 45], y: [0, -5, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Diamond color="orange" size={20} />
      </motion.div>

      <motion.div
        className="absolute top-[55%] right-[28%] opacity-50"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={22} color="teal" direction="down" />
      </motion.div>

      <motion.div
        className="absolute top-[58%] left-[25%] opacity-55"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <PlusShape size={55} />
      </motion.div>

      <motion.div
        className="absolute top-[62%] right-[18%] opacity-55"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={26} color="teal" direction="up" />
      </motion.div>

      <motion.div
        className="absolute top-[65%] left-[15%] opacity-55"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={28} color="navy" direction="down" />
      </motion.div>

      <motion.div
        className="absolute top-[68%] right-[35%] opacity-60"
        animate={{ rotate: [45, 48, 45] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Diamond color="teal" size={20} />
      </motion.div>

      <motion.div
        className="absolute top-[72%] left-[32%] opacity-60"
        animate={{ rotate: [45, 50, 45] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Diamond color="orange" size={22} />
      </motion.div>

      <motion.div
        className="absolute top-[75%] right-[8%] opacity-55"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <SharpSquare size={30} color="orange" />
      </motion.div>

      <motion.div
        className="absolute top-[78%] left-[22%] opacity-50"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <SharpSquare size={24} color="navy" />
      </motion.div>

      <motion.div
        className="absolute top-[82%] right-[25%] opacity-50"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <DiagonalSquares size={45} />
      </motion.div>

      <motion.div
        className="absolute top-[85%] left-[45%] opacity-50"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <DiagonalSquares size={50} />
      </motion.div>

      <motion.div
        className="absolute top-[88%] right-[42%] opacity-45"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={24} color="teal" direction="up" />
      </motion.div>

      <motion.div
        className="absolute top-[92%] left-[38%] opacity-55"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <PlusShape size={55} />
      </motion.div>

      <motion.div
        className="absolute top-[90%] right-[15%] opacity-50"
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triangle size={20} color="orange" direction="right" />
      </motion.div>

      <motion.div
        className="absolute top-[28%] left-[55%] opacity-45"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <PlusShape size={50} />
      </motion.div>

      <motion.div
        className="absolute top-[45%] right-[45%] opacity-50"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <SharpSquare size={22} color="navy" />
      </motion.div>

      <header className="border-b backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <AASULogo size="sm" animated={false} />
            <div className="flex flex-col">
              <h1
                className="text-lg font-bold leading-tight"
                style={{ color: "#0e1c43" }}
              >
                AASU
              </h1>
              <span className="text-xs text-muted-foreground">
                Research Portal
              </span>
            </div>
          </motion.div>
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <Button
              data-testid="button-login"
              className="shadow-md"
              onClick={() => setLocation("/login")}
            >
              Log In
            </Button>
          </motion.div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 md:py-20 relative">
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#60c2ac]/30"
              style={{ backgroundColor: "rgba(96, 194, 172, 0.1)" }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "#60c2ac" }} />
              <span
                className="text-sm font-medium"
                style={{ color: "#60c2ac" }}
              >
                Abdullah Al Salem University
              </span>
            </div>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl md:text-5xl font-bold tracking-tight"
          >
            Research Project
            <span
              className="block mt-2"
              style={{
                background:
                  "linear-gradient(135deg, #0e1c43 0%, #60c2ac 50%, #fbb216 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Management System
            </span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Fostering innovation in education and research through streamlined
            project proposal submission, peer review, and AI-assisted evaluation
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="pt-4 flex gap-4 justify-center flex-wrap"
          >
            <Button
              size="lg"
              data-testid="button-get-started"
              className="shadow-lg group"
              onClick={() => setLocation("/login")}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="shadow-md"
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <section className="container mx-auto px-4 py-16 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-3xl font-bold text-center mb-4">
              Key Features
            </h3>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Supporting Kuwait Vision 2035 through world-class research
              management
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: FileText,
                title: "Project Submission",
                description:
                  "Submit research proposals with complete documentation and file uploads",
                color: "#0e1c43",
                delay: 0,
              },
              {
                icon: Zap,
                title: "AI Evaluation",
                description:
                  "Automated AI assessment for relevance, clarity, and institutional alignment",
                color: "#fbb216",
                delay: 0.1,
              },
              {
                icon: Users,
                title: "Expert Review",
                description:
                  "Multi-reviewer evaluation with detailed feedback and comprehensive grading",
                color: "#60c2ac",
                delay: 0.2,
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description:
                  "Real-time insights and reporting for administrators and editors",
                color: "#0e1c43",
                delay: 0.3,
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay, duration: 0.5 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="h-full border-2 hover:border-[#60c2ac]/30 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#60c2ac]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="pt-6 text-center space-y-3 relative">
                    <motion.div
                      className="h-12 w-12 rounded-lg flex items-center justify-center mx-auto shadow-md group-hover:shadow-lg transition-shadow"
                      style={{ backgroundColor: `${feature.color}15` }}
                      whileHover={{ rotate: 5, scale: 1.1 }}
                    >
                      <feature.icon
                        className="h-6 w-6"
                        style={{ color: feature.color }}
                      />
                    </motion.div>
                    <h4 className="font-semibold text-lg">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-3xl font-bold text-center mb-4">
              Research Centers
            </h3>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Supporting cutting-edge research across multiple disciplines
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: FlaskConical,
                name: "Data Science & AI",
                color: "#60c2ac",
              },
              { icon: Building2, name: "Cyber Security", color: "#0e1c43" },
              { icon: BookOpen, name: "Marine Research", color: "#60c2ac" },
              { icon: GraduationCap, name: "Innovation", color: "#fbb216" },
            ].map((center, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50"
              >
                <center.icon
                  className="h-8 w-8"
                  style={{ color: center.color }}
                />
                <span className="text-sm font-medium text-center">
                  {center.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-3xl font-bold text-center mb-12">
              How It Works
            </h3>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                number: 1,
                title: "Submit Your Proposal",
                description:
                  "Faculty members submit research proposals with detailed descriptions, budgets, timelines, and supporting documents",
              },
              {
                number: 2,
                title: "AI-Powered Analysis",
                description:
                  "Automated evaluation assesses project alignment with university goals, clarity, and feasibility (40% weight)",
              },
              {
                number: 3,
                title: "Expert Peer Review",
                description:
                  "Multiple expert reviewers evaluate and grade your project based on comprehensive criteria (60% weight)",
              },
              {
                number: 4,
                title: "Receive Results",
                description:
                  "Get comprehensive feedback, detailed recommendations, and your final evaluation score",
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="flex gap-4 group"
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all"
                  style={{
                    background:
                      "linear-gradient(135deg, #0e1c43 0%, #60c2ac 100%)",
                  }}
                >
                  {step.number}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 group-hover:text-[#60c2ac] transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t mt-16 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <AASULogo size="sm" animated={false} />
              <span>Abdullah Al Salem University</span>
            </div>
            <p>
              &copy; {new Date().getFullYear()} AASU Research Portal. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
