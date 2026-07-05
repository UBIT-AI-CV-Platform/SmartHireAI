Zefani heading font
===================

Zefani is not a Google Font, so its font file has to live here.

Drop the font file in THIS folder and name it "Zefani" with its own extension:

  frontend/public/fonts/Zefani.woff2   (preferred)
  frontend/public/fonts/Zefani.woff
  frontend/public/fonts/Zefani.ttf
  frontend/public/fonts/Zefani.otf

Any ONE of these formats is enough - the browser loads whichever exists.
.woff2 is smallest/fastest; if you only have a .ttf/.otf that's fine too.

Once the file is here, headings using the `font-heading` class (currently just
the landing hero <h1>) will render in Zefani automatically. Until then they
fall back to Sora - no error.

The @font-face rule is defined in frontend/app/globals.css.
