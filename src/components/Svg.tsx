/** Renders trusted SVG markup built by src/lib/art.ts (constants + validated colours + escaped text only). */
export function Svg({ html }: { html: string }) {
  return <span className="dc" dangerouslySetInnerHTML={{ __html: html }} />;
}
