import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import { GradientBackground } from "./components/GradientBackground";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Problem } from "./scenes/Scene2Problem";
import { Scene3Solution } from "./scenes/Scene3Solution";
import { Scene4Features } from "./scenes/Scene4Features";
import { Scene5Extension } from "./scenes/Scene5Extension";
import { Scene6CTA } from "./scenes/Scene6CTA";

// Scene durations (in frames at 30fps)
// Scene1: 90 (3s) | Scene2: 105 (3.5s) | Scene3: 105 (3.5s)
// Scene4: 195 (6.5s) | Scene5: 105 (3.5s) | Scene6: 120 (4s)
// Total with transitions: ~720 frames = 24s

const TRANSITION_DURATION = 20;
const transitionConfig = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION });

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <GradientBackground />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene1Hook />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={transitionConfig}
        />

        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene2Problem />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={transitionConfig}
        />

        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene3Solution />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={transitionConfig}
        />

        <TransitionSeries.Sequence durationInFrames={195}>
          <Scene4Features />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={transitionConfig}
        />

        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene5Extension />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={transitionConfig}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene6CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
