# Životinja source-pack workflow

Ovaj folder je dogovoreni produkcioni osnov za temu **Životinja**.

## Fajlovi

- `zivotinja-final-reference.png` — originalna finalna kompozicija.
- `zivotinja-clean-plate.png` — pozadina bez živih elemenata.
- `zivotinja-object-id-map.png` — ravna ID/mask mapa: svaki živi objekat ili pokretni deo ima svoju boju.
- `zivotinja-object-id-overlay-preview.png` — pregled ID mape preko originalne slike.
- `zivotinja-production-manifest.json` — imena slojeva, boje, približni bbox i animaciona pravila.

## Pravilo

Za finalnu animiranu verziju ne sečemo životinje iz već spljoštene slike.
Generator/artist pipeline mora odmah da izveze:

1. finalnu sliku,
2. clean plate,
3. object ID mapu,
4. zasebne transparentne PNG slojeve za svaki objekat,
5. zasebne transparentne PNG slojeve samo za pokretne delove.

Primer: kod zeca telo ostaje jedan sloj, a `rabbit_ears` je poseban sloj samo sa ušima.
Kod lisice `fox_tail` ne sme da sadrži torzo.
Kod sove `owl_wings` ne sme da sadrži glavu, granu ili krošnju.

## Prompt za sledeći izvorni render

```text
Use case: stylized-concept
Asset type: mobile game theme background source pack
Primary request: Create a Soft Matte 3D / Clay-style 3D animal theme background for a mobile game, in the same composition as the supplied final reference: warm forest valley, rounded clay hills, soft sky, clouds, owl on left branch, fox lower left, hedgehog lower left, deer mid-right, rabbit lower right, small birds and butterflies.
Style/medium: soft matte clay 3D, puffy shapes, gentle depth, warm pastel colors, clean mobile-game readability.
Composition/framing: portrait 941x1672 composition, keep top safe-zone readable, preserve exact animal/object positions from the reference.
Lighting/mood: bright, soft, cheerful, saturated enough for phone display.
Required exports:
1. final full render,
2. clean plate with all animated objects removed and naturally inpainted,
3. exact object ID map at the same canvas size, flat solid colors, no gradients, no antialias blur, no shadows,
4. transparent PNG layer for every animated object,
5. transparent PNG layer for every moving part only.
Layer rules:
- clouds as separate cloud_left, cloud_top, cloud_right layers,
- flyers as separate bird/butterfly layers,
- owl_body separate from owl_wings; owl_wings must contain only wings,
- fox_body separate from fox_tail; fox_tail must contain only tail,
- deer_body separate from deer_head and deer_front_leg,
- hedgehog_body separate from hedgehog_eyelids,
- rabbit_body separate from rabbit_ears; rabbit_ears must contain only ears.
Constraints: no text, no logos, no watermark. Do not merge moving parts into the body. Do not include background pixels in transparent layers.
Avoid: hard glossy plastic, realistic fur, hard outlines, messy cutout edges, duplicate animals, changed positions.
```

