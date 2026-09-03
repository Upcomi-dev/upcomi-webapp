"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Backpack,
  BedDouble,
  Calendar,
  CirclePlus,
  Clock,
  Compass,
  Droplet,
  Flag,
  GraduationCap,
  Heart,
  MapPin,
  MessageCirclePlus,
  MoveHorizontal,
  ShieldCheck,
  Smile,
  Star,
  Users,
  Venus,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  buildAddMeasureMailto,
  INCLUSION_MEASURE_GROUPS,
  INCLUSION_MEASURES_COLLAPSE_AT,
  type InclusionMeasure,
} from "@/lib/events/inclusion-measures";

/**
 * Dictionnaire explicite : le nom d'icône vient de la base, on ne résout
 * jamais un composant par clé arbitraire. Une valeur inconnue retombe sur
 * ShieldCheck.
 */
const MEASURE_ICONS: Record<string, LucideIcon> = {
  Award,
  Backpack,
  BedDouble,
  Calendar,
  Clock,
  Compass,
  Droplet,
  Flag,
  GraduationCap,
  Heart,
  MapPin,
  MessageCirclePlus,
  MoveHorizontal,
  ShieldCheck,
  Smile,
  Star,
  Users,
  Venus,
};

interface InclusionMeasuresProps {
  eventName: string;
  measures: InclusionMeasure[];
}

/**
 * Ce que l'organisation fait pour les femmes et minorités de genre.
 *
 * Toujours affiché, même vide : l'absence de mesure est elle aussi une
 * information, et c'est souvent elle qui décide de s'inscrire ou non.
 * TODO : brancher sur le formulaire de feedback pour signaler une nouvelel mesure
 */
export function InclusionMeasures({ eventName, measures }: InclusionMeasuresProps) {
  const [expanded, setExpanded] = useState(false);
  const [openMeasure, setOpenMeasure] = useState<InclusionMeasure | null>(null);

  // `measures` arrive déjà triées par groupe puis par position (voir
  // fetchEventInclusionMeasures) : le rang dans la liste dit donc directement
  // si une mesure tombe au-delà du seuil de repli.
  const groups = useMemo(() => {
    const ranked = measures.map((measure, index) => ({
      measure,
      extra: index >= INCLUSION_MEASURES_COLLAPSE_AT,
    }));
    return INCLUSION_MEASURE_GROUPS.map((group) => ({
      ...group,
      items: ranked.filter(({ measure }) => measure.measure_group === group.id),
    })).filter((group) => group.items.length > 0);
  }, [measures]);

  const collapsible = measures.length > INCLUSION_MEASURES_COLLAPSE_AT;

  return (
    // Carte dans la carte : le vert de la charte isole le bloc du reste de
    // « Qui organise ? », et la marge négative rattrape une partie du padding
    // du parent pour que le contenu ne soit pas rogné deux fois.
    <section className="-mx-2 -mb-2 mt-7 rounded-[var(--radius-md)] bg-green-light p-4 text-green">
      <h3 className="mb-3.5 font-serif text-[20px] leading-tight">
        Ce que l&apos;organisation fait pour les femmes et minorités de genre
      </h3>

      {measures.length === 0 ? (
        <p className="text-sm leading-[1.6] text-green/75">
          Pour l&apos;instant, aucune mesure d&apos;inclusivité n&apos;est listée dans
          Upcomi pour cet évènement.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-5">
            {groups.map((group) => {
              const visibleItems = expanded
                ? group.items
                : group.items.filter((item) => !item.extra);
              // Un groupe entièrement replié disparaît avec ses mesures plutôt
              // que de laisser un titre sans rien dessous.
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.id}>
                  <h4 className="mb-1 text-[14px] font-bold leading-snug text-green/75">
                    {group.label}
                  </h4>
                  <ul className="flex flex-col gap-1">
                    {visibleItems.map(({ measure }) => {
                      const Icon = MEASURE_ICONS[measure.icon] ?? ShieldCheck;
                      return (
                        <li key={measure.id}>
                          <button
                            type="button"
                            onClick={() => setOpenMeasure(measure)}
                            className="flex w-full items-center gap-2.5 py-1 text-left text-[14px] leading-snug text-green/75 transition-colors hover:text-green-dark"
                          >
                            <Icon className="h-4 w-4 flex-none" strokeWidth={1.8} />
                            <span>{measure.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-4 block text-[14px] font-semibold hover:underline"
            >
              {expanded ? "Voir moins" : "Voir tout"}{" "}
              <span className="font-normal text-green/75">({measures.length})</span>
            </button>
          )}
        </>
      )}

      <a
        href={buildAddMeasureMailto(eventName)}
        className="mt-4 inline-flex items-start gap-1.5 text-[14px] font-semibold hover:underline"
      >
        <CirclePlus className="mt-[3px] h-3.5 w-3.5 flex-none" strokeWidth={1.8} />
        Signaler une mesure qui a été mise en place
      </a>

      <Dialog
        open={openMeasure !== null}
        onOpenChange={(next) => !next && setOpenMeasure(null)}
      >
        <DialogContent className="gap-0">
          {openMeasure && <MeasureDetail measure={openMeasure} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Le libellé seul ne dit pas pourquoi une mesure compte : le détail l'explique. */
function MeasureDetail({ measure }: { measure: InclusionMeasure }) {
  const Icon = MEASURE_ICONS[measure.icon] ?? ShieldCheck;
  return (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-light text-green">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <DialogTitle className="mt-3 mb-2 font-serif text-[19px] leading-tight text-foreground">
        {measure.label}
      </DialogTitle>
      <p className="text-sm leading-[1.6] text-foreground/55">{measure.description}</p>
    </>
  );
}
