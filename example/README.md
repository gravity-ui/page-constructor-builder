# Page Constructor Builder Example

This example demonstrates how to use the Page Constructor Builder with various features including favicon support.

## Project Structure

```
example/
├── assets/
│   ├── logo.svg          # Favicon file (SVG format)
│   ├── hero-banner.svg   # Used in page content
│   └── about-banner.svg  # Used in page content
├── components/
│   └── CustomBlock.tsx   # Custom React component
├── pages/
│   ├── index.yml         # Home page configuration
│   └── about.yml         # About page configuration
├── styles/
│   └── main.css          # Custom styles
├── navigation.yml        # Global navigation configuration
└── page-builder.config.yml # Build configuration with favicon
```

## Favicon Configuration

The example demonstrates favicon configuration in `page-builder.config.yml`:

```yaml
favicon: logo.svg # Uses logo.svg from assets/ directory
```

### Favicon Options

You can configure favicons in several ways:

1. **Local file from assets directory:**

   ```yaml
   favicon: logo.svg
   ```

2. **Local file from subdirectory:**

   ```yaml
   favicon: icons/favicon.ico
   ```

3. **External URL:**

   ```yaml
   favicon: https://cdn.example.com/favicon.ico
   ```

4. **Custom path:**
   ```yaml
   favicon: ./custom/favicon.png
   ```

## Building the Example

To build this example:

```bash
# From the example directory
../dist/cli.js build

# Or from the project root
cd example && ../dist/cli.js build
```

The favicon will be:

- Automatically copied to `dist/assets/logo.svg`
- Included in the HTML head as: `<link rel="icon" type="image/svg+xml" href="assets/logo.svg">`

## Viewing the Result

After building, open `dist/index.html` in your browser. You should see:

- The page content rendered properly
- The favicon (logo.svg) displayed in the browser tab
- Proper HTML meta tags in the page source

## Supported Favicon Formats

The builder supports all common favicon formats:

- **SVG** (recommended) - scalable and modern
- **ICO** - classic format with broad browser support
- **PNG** - high quality raster format
- **JPG/JPEG** - compressed raster format
- **GIF** - supports animation
