import fs from 'node:fs';
import union from '@turf/union';

const input = JSON.parse(fs.readFileSync('www/assets/world-boundaries-source.geojson', 'utf8'));
const serbia = input.features.find(feature => feature.properties.ISO_A3 === 'SRB');
const kosovo = input.features.find(feature => feature.properties.ADMIN === 'Kosovo');

if (!serbia || !kosovo) {
    throw new Error('Nisu pronađeni poligoni Srbije i Kosova u izvornom skupu granica.');
}

// Prikaz za igru prati zadatu UN referencu: jedan poligon, bez unutrašnje
// državne granice i bez natpisa na karti.
const spojenaSrbija = union({ type: 'FeatureCollection', features: [serbia, kosovo] });
spojenaSrbija.properties = {
    id: 'SRB',
    naziv: 'Srbija'
};

const features = input.features
    .filter(feature => feature !== serbia && feature !== kosovo)
    .map((feature, index) => ({
        type: 'Feature',
        properties: {
            id: feature.properties.ISO_A3 && feature.properties.ISO_A3 !== '-99'
                ? feature.properties.ISO_A3
                : `country-${index}`,
            naziv: feature.properties.ADMIN || ''
        },
        geometry: feature.geometry
    }));

features.push(spojenaSrbija);

fs.writeFileSync(
    'www/assets/world-boundaries.geojson',
    JSON.stringify({ type: 'FeatureCollection', features })
);
