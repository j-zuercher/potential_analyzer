// All German strings live here. No string literals in compute or UI code.
// Spec §5.4 Rule 3 + §4.3 BuildX framework rule (no em dashes).

export const copy = {
  app: {
    eyebrow: 'BuildX',
    title: 'Potenzial Analyse',
    subtitle: 'Aufstockungspotenzial · Stadt Zürich · öffentliche Daten',
  },
  input: {
    placeholder: 'Adresse eingeben (z.B. Seefeldstrasse 100, 8008 Zürich)',
    submit: 'Auswerten',
    submitting: 'Auswertung läuft …',
  },
  ausbaustandard: {
    label: 'Ausbaustandard',
    niedrig: 'Niedrig',
    mittel: 'Mittel',
    hoch: 'Hoch',
  },
  askingPrice: {
    label: 'Kaufpreis (optional)',
    placeholder: '2500000',
    comparisonLabel: 'Kaufpreis-Deckung',
    hint: 'Netto-Potenzial deckt',
    ofPrice: 'des Kaufpreises',
  },
  emptyState: {
    headline: 'Adresse nicht gefunden',
    body: 'Bitte eine Stadt-Zürich-Adresse eingeben. Beispiele:',
  },
  errorState: {
    headline: 'Daten konnten nicht geladen werden',
    body: 'Zonendaten oder Gebäudedaten sind vorübergehend nicht verfügbar. Bitte erneut versuchen.',
  },
  result: {
    reserveLabel: 'Zusätzliche m² BGF',
    reserveSubline: 'AZ Reserve',
    reserveCompareLabel: 'Heute (BZO 2016)',
    chfLabel: 'CHF Potenzial Range',
    chfSubline: 'Netto nach Baukosten',
    feasibilityLabel: 'Machbarkeit (öffentliche Daten)',
    feasibilityAz: 'Zonenplan AZ Reserve',
    feasibilityIsos: 'ISOS / Hinweisinventar',
    feasibilityDenkmal: 'Denkmalschutz',
    confidenceLabel: 'Konfidenz',
    bzoFooter:
      'BZO 2026 (öffentliche Auflage), negative Vorwirkung beachtet',
  },
  verdict: {
    stark: 'Starkes Potenzial',
    pruefenswert: 'Prüfenswert',
    kein: 'Kein Potenzial',
  },
  bgfBar: {
    title: 'BGF Ausnützung',
    bestandLabel: 'Bestand',
    reserve2016Label: 'Reserve BZO 2016',
    reserve2026Label: 'Reserve BZO 2026',
    maxLabel: 'Max BZO 2026',
  },
  map: {
    openMap: 'Auf Karte zeigen →',
  },
  caveats: {
    isosHinweis: 'ISOS Hinweisinventar, Einzelfallprüfung erforderlich',
    statikGap: 'Statik nicht geprüft',
    bzoOeffentlicheAuflage: 'BZO 2026 in öffentlicher Auflage',
    marktwertCluster: 'Marktwert basiert auf Stadtkreis-Cluster',
    edgeZone: 'Zone ausserhalb gängiger Demoauswahl',
    edgeBaujahr: 'Baujahr ausserhalb der Standardannahmen',
    bgfProxy: 'BGF aus GWR Stockwerke x Grundfläche (Näherung, ca. +/-20%)',
    bgfUnavailable: 'BGF nicht verfügbar, Potenzial ab Leerparzel berechnet',
    qZone: 'Quartiererhaltungszone: als W3 angenähert (Einzelfallprüfung empfohlen)',
  },
} as const;
