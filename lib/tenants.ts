export interface TenantConfig {
  id: string;
  naam: string;
  kleur: string;
  tekstKleur: string;
  intro: string;
  subIntro: string;
}

export const tenants: Record<string, TenantConfig> = {
  vpro: {
    id: "vpro",
    naam: "VPRO",
    kleur: "#FF6200",
    tekstKleur: "#ffffff",
    intro: "Heb jij een tip voor de redactie?",
    subIntro: "Deel je ervaring, vraag of tip. Onze redactie leest alles.",
  },
  pointer: {
    id: "pointer",
    naam: "Pointer",
    kleur: "#C8F000",
    tekstKleur: "#000000",
    intro: "Heb jij een tip voor de redactie?",
    subIntro: "Honderden tipgevers gingen je al voor. Ons onderzoek begint bij jou.",
  },
};

export const defaultTenant = tenants.vpro;
