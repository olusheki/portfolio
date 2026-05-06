import { useState } from "react";
import { X } from "lucide-react";

const ExpandableImage = ({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`w-full h-auto rounded-sm border border-border mb-4 cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setExpanded(true)}
      />
      {expanded && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ExpandableImage;
