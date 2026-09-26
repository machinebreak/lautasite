# Space scene assets

The local image maps in this directory are NASA/JPL-Caltech public resources:

- `saturn.webp` — [NASA Science: Saturn 3D Resource](https://science.nasa.gov/3d-resources/saturn/)
- `venus.webp` — [NASA Science: Venus 3D Resource](https://science.nasa.gov/3d-resources/venus/)
- `mars.webp` — [NASA Science: Mars 3D Resource](https://science.nasa.gov/3d-resources/mars/)
- `moon.webp` — [NASA Science: Apollo 11 View of the Moon](https://science.nasa.gov/3d-resources/apollo-11-view-of-the-moon/) (used as the live Moon texture map)
- `nebula.jpg` — [NASA Photojournal: Four Famous Nebulae](https://science.nasa.gov/photojournal/four-famous-nebulae/) (public domain; re-encoded to `nebula.webp`. Note: it IS used — the nebula plane in the WebGL scene crops a region of it at runtime)
- `earth_atmos.webp`, `earth_normal.webp`, `earth_specular.webp`, `earth_clouds.webp` — NASA Blue Marble / Earth Observatory maps distributed with the [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets) (public domain, courtesy NASA). Re-encoded from the original JPG/PNG maps to WebP (see `scripts/optimize-space-textures.mjs`)
- `sun.webp` — [Solar System Scope Sun texture](https://www.solarsystemscope.com/textures/) (CC BY 4.0, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_sun.jpg)). Re-encoded to WebP

The Saturn, Venus, Mars, Moon, Earth, and Sun assets are used as texture maps in the Three.js scene. NASA and JPL do not endorse this site. Solar System Scope textures are used under CC BY 4.0.
