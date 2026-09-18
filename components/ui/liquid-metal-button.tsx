"use client";

import {
  defaultObjectSizing,
  liquidMetalFragmentShader,
  ShaderFitOptions,
  ShaderMount,
} from "@paper-design/shaders";
import { Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
}

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const IDLE_SPEED = 0.6;
const HOVER_SPEED = 1;
const CLICK_SPEED = 2.4;

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<ShaderMount | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);
  // Read inside timeouts, where the `isHovered` state would be stale.
  const hoveredRef = useRef(false);

  const dimensions = useMemo(() => {
    if (viewMode === "icon") {
      return { width: 46, height: 46, innerWidth: 42, innerHeight: 42 };
    }
    return { width: 160, height: 46, innerWidth: 156, innerHeight: 42 };
  }, [viewMode]);

  useEffect(() => {
    const styleId = "shader-canvas-style-exploded";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
        @keyframes ripple-animation {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    if (!shaderRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      shaderMount.current = new ShaderMount(
        shaderRef.current,
        liquidMetalFragmentShader,
        {
          u_colorBack: [0, 0, 0, 0],
          u_colorTint: [1, 1, 1, 1],
          u_repetition: 4,
          u_softness: 0.5,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 45,
          u_shape: 1,
          u_isImage: false,
          u_fit: ShaderFitOptions.cover,
          u_scale: 2.4,
          u_rotation: defaultObjectSizing.rotation,
          u_originX: defaultObjectSizing.originX,
          u_originY: defaultObjectSizing.originY,
          u_offsetX: 0.1,
          u_offsetY: -0.1,
          u_worldWidth: 0,
          u_worldHeight: 0,
        },
        undefined,
        reduceMotion ? 0 : IDLE_SPEED,
      );
    } catch (error) {
      console.error("Failed to load shader:", error);
    }

    return () => {
      const mount = shaderMount.current;
      shaderMount.current = null;
      if (!mount) return;
      // dispose() removes the canvas but keeps its WebGL context alive until GC;
      // release it now so route changes don't accumulate contexts. Each mount
      // creates its own canvas, so this is safe under Strict Mode remounts.
      const gl = mount.canvasElement.getContext("webgl2");
      mount.dispose();
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  const setSpeed = (speed: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    shaderMount.current?.setSpeed(speed);
  };

  const handleMouseEnter = () => {
    hoveredRef.current = true;
    setIsHovered(true);
    setSpeed(HOVER_SPEED);
  };

  const handleMouseLeave = () => {
    hoveredRef.current = false;
    setIsHovered(false);
    setIsPressed(false);
    setSpeed(IDLE_SPEED);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setSpeed(CLICK_SPEED);
    setTimeout(() => setSpeed(hoveredRef.current ? HOVER_SPEED : IDLE_SPEED), 300);

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Keyboard activation reports (0, 0); ripple from the center instead.
      const fromPointer = e.clientX !== 0 || e.clientY !== 0;
      const ripple = {
        x: fromPointer ? e.clientX - rect.left : rect.width / 2,
        y: fromPointer ? e.clientY - rect.top : rect.height / 2,
        id: rippleId.current++,
      };
      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }

    onClick?.();
  };

  const layerTransition = `all 0.8s ${SPRING}, width 0.4s ease, height 0.4s ease`;
  const pressTransform = isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)";
  const glowing = isHovered || isFocused;

  return (
    <div className="relative inline-block">
      <div style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}>
        <div
          style={{
            position: "relative",
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            transformStyle: "preserve-3d",
            transition: layerTransition,
          }}
        >
          {/* Label */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transformStyle: "preserve-3d",
              transition: `${layerTransition}, gap 0.4s ease`,
              transform: "translateZ(20px)",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            {viewMode === "icon" ? (
              <Sparkles
                size={16}
                style={{
                  color: "#e2e8f0",
                  filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.7))",
                  transition: `all 0.8s ${SPRING}`,
                  transform: "scale(1)",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: "14px",
                  color: "#e2e8f0",
                  fontWeight: 500,
                  textShadow: "0px 1px 3px rgba(0, 0, 0, 0.8)",
                  transition: `all 0.8s ${SPRING}`,
                  transform: "scale(1)",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            )}
          </div>

          {/* Dark inner face; leaves a 2px liquid-metal rim visible. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transition: layerTransition,
              transform: `translateZ(10px) ${pressTransform}`,
              zIndex: 20,
            }}
          >
            <div
              style={{
                width: `${dimensions.innerWidth}px`,
                height: `${dimensions.innerHeight}px`,
                margin: "2px",
                borderRadius: "100px",
                background: "linear-gradient(180deg, #18181b 0%, #09090b 100%)",
                boxShadow: isPressed
                  ? "inset 0px 2px 4px rgba(0, 0, 0, 0.6), inset 0px 1px 2px rgba(0, 0, 0, 0.4)"
                  : "none",
                transition: `${layerTransition}, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            />
          </div>

          {/* Liquid-metal shader layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transition: layerTransition,
              transform: `translateZ(0px) ${pressTransform}`,
              zIndex: 10,
            }}
          >
            <div
              style={{
                height: `${dimensions.height}px`,
                width: `${dimensions.width}px`,
                borderRadius: "100px",
                boxShadow: isPressed
                  ? "0px 0px 0px 1px rgba(255, 255, 255, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.4)"
                  : glowing
                    ? "0px 0px 16px 2px rgba(255, 255, 255, 0.12), 0px 0px 0px 1px rgba(255, 255, 255, 0.2)"
                    : "0px 0px 0px 1px rgba(255, 255, 255, 0.08)",
                outline: isFocused ? "2px solid rgba(255, 255, 255, 0.55)" : "none",
                outlineOffset: "3px",
                transition: `${layerTransition}, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              <div
                ref={shaderRef}
                className="shader-container-exploded"
                style={{
                  borderRadius: "100px",
                  overflow: "hidden",
                  position: "relative",
                  width: `${dimensions.width}px`,
                  height: `${dimensions.height}px`,
                  transition: "width 0.4s ease, height 0.4s ease",
                }}
              />
            </div>
          </div>

          <button
            ref={buttonRef}
            type="button"
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onFocus={(e) => setIsFocused(e.currentTarget.matches(":focus-visible"))}
            onBlur={() => setIsFocused(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              outline: "none",
              zIndex: 40,
              transformStyle: "preserve-3d",
              transform: "translateZ(25px)",
              transition: layerTransition,
              overflow: "hidden",
              borderRadius: "100px",
            }}
            aria-label={label}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                style={{
                  position: "absolute",
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)",
                  pointerEvents: "none",
                  animation: "ripple-animation 0.6s ease-out",
                }}
              />
            ))}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiquidMetalButton;
