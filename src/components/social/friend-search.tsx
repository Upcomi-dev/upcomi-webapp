"use client";

import { useMemo, useState } from "react";
import { PersonRow } from "@/components/social/person-row";
import { getPersonFullName, MOCK_PEOPLE } from "@/lib/social/mock-social";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Recherche des ami·es : par nom, et **rien tant qu'on n'a pas tapé**.
 *
 * La liste complète des membres n'a pas à s'exposer par défaut — c'est le
 * choix du prototype et il est structurant : on vient ici retrouver quelqu'un
 * qu'on connaît, pas parcourir l'annuaire de la communauté. L'écran vide au
 * chargement n'est donc pas un manque, c'est la fonctionnalité.
 *
 * MAQUETTE : la recherche tourne sur les personnes en dur de
 * `lib/social/mock-social`.
 */
export function FriendSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];
    return MOCK_PEOPLE.filter((person) =>
      normalize(getPersonFullName(person)).includes(needle)
    ).sort((a, b) => getPersonFullName(a).localeCompare(getPersonFullName(b), "fr"));
  }, [query]);

  const typed = query.trim().length > 0;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Le nom d'une personne…"
        aria-label="Chercher une personne par son nom"
        className="w-full rounded-[18px] border border-white/55 bg-white/70 px-5 py-3 text-sm text-foreground outline-none transition-all placeholder:text-foreground/35 focus:border-coral/35 focus:bg-white"
      />

      <div className="mt-5">
        {!typed ? (
          <p className="text-sm text-foreground/55">
            Commence à écrire le nom de la personne que tu cherches…
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-foreground/55">
            Aucune personne ne correspond à «&nbsp;{query.trim()}&nbsp;».
          </p>
        ) : (
          <div className="flex flex-col">
            {results.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
