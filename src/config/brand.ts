// Brand theme selection based on environment variable
const brandTheme = process.env.NEXT_PUBLIC_BRAND || "degen";

// Conditional import based on theme
const { heroCarouselImages } = brandTheme === "minimal" 
  ? require("./brand.minimal")
  : require("./brand.degen");

export { heroCarouselImages };
