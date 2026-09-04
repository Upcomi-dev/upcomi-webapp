"use client";

import Image from "next/image";
import { ExternalLink, PenLine } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { getAppStorageImage } from "@/lib/storage/urls";
import {
  ANONYMOUS_STORY_AUTHOR,
  getStoryLinkLabel,
  hasStoryContent,
  type EventStory,
} from "@/lib/events/stories";
import { useEventStories, type StoryEvent } from "./event-stories-context";

interface EventStoriesProps {
  event: StoryEvent;
  /** Vide pour une visiteuse déconnectée : la fonction est réservée aux comptes. */
  stories: EventStory[];
  /** Compté en base, y compris quand les récits ne sont pas lisibles ici. */
  storyCount: number;
  /** L'évènement est-il terminé ? On ne demande un récit qu'après coup. */
  isPast: boolean;
}

/**
 * Le bloc « Retours d'expérience » du prototype (`event-detail.js`,
 * `storiesHTML`), avec deux écarts assumés :
 *
 * - le texte libre s'affiche sous le nom. Le prototype n'avait que le lien,
 *   la table a les deux et un récit écrit ici mérite d'être lu ici ;
 * - déconnectée, on annonce le nombre de récits sans les charger. Le
 *   prototype masque le vrai contenu derrière un dégradé, ce qui le laisse
 *   lisible dans le code source — un récit est du contenu identifiant.
 */
export function EventStories({ event, stories, storyCount, isPast }: EventStoriesProps) {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isParticipating } = useFavorites();
  const { hasOwnStory, openStoryModal, ready } = useEventStories();

  const isAuthenticated = user !== null;
  const ownStory = isAuthenticated && hasOwnStory(event.id);
  // On ne sollicite que celles qui étaient là : « j'y participe » sur un
  // évènement terminé, c'est exactement ce que relance le bandeau orange.
  const canContribute = isAuthenticated && isPast && isParticipating(event.id);

  if (storyCount === 0 && !canContribute) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-4 font-serif text-[22px] leading-tight text-foreground">
        Retours d&apos;expérience de la communauté
      </h2>

      {isAuthenticated ? (
        stories.length > 0 ? (
          <div className="divide-y divide-black/8">
            {stories.filter(hasStoryContent).map((story) => (
              <StoryRow key={story.userId} story={story} isOwn={story.userId === user.id} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/55">
            Personne n&apos;a encore raconté cet évènement. Si tu y étais, tu peux ouvrir le bal.
          </p>
        )
      ) : (
        <GatedStories
          count={storyCount}
          onOpenAuth={() =>
            openAuthModal({
              title: "Rejoins la communauté Upcomi pour voir les récits de l'évènement",
            })
          }
        />
      )}

      {/* Le bouton n'apparaît qu'une fois les récits de l'utilisatrice
          chargés : sans ça il annoncerait « Ajoute ton récit » à quelqu'un
          qui vient d'en écrire un, le temps de la lecture. */}
      {canContribute && ready && (
        <button
          type="button"
          onClick={() => openStoryModal(event)}
          className="btn-secondary btn-small mt-4"
        >
          <PenLine className="h-3.5 w-3.5" strokeWidth={1.8} />
          {ownStory ? "Modifier mon récit" : "Ajoute ton récit"}
        </button>
      )}
    </section>
  );
}

function StoryRow({ story, isOwn }: { story: EventStory; isOwn: boolean }) {
  const authorName = story.authorName || ANONYMOUS_STORY_AUTHOR;
  const text = story.story?.trim();

  return (
    <div className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <StoryAvatar avatarUrl={story.authorAvatarUrl} />

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {authorName}
          {isOwn && <span className="ml-1.5 font-normal text-foreground/45">(toi)</span>}
        </div>

        {text && (
          <p className="mt-1 whitespace-pre-line text-[14px] leading-[1.65] text-foreground/72">
            {text}
          </p>
        )}

        {story.storyUrl && (
          <a
            href={story.storyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary btn-small mt-4"
          >
            Son récit sur {getStoryLinkLabel(story.storyUrl)}
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * L'avatar du profil public, quand il y en a un. Pas de pastille à l'initiale
 * en repli : personne n'a encore d'avatar, et une lettre inventée se lit comme
 * une photo qu'on n'aurait pas su charger.
 */
function StoryAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  const avatar = getAppStorageImage(avatarUrl);

  if (!avatar) return null;

  return (
    <div className="relative h-9 w-9 flex-none overflow-hidden rounded-full">
      <Image
        src={avatar.src}
        alt=""
        fill
        unoptimized={avatar.unoptimized}
        className="object-cover"
        sizes="36px"
      />
    </div>
  );
}

function GatedStories({ count, onOpenAuth }: { count: number; onOpenAuth: () => void }) {
  return (
    <div>
      <p className="text-sm text-foreground/72">
        {count > 1
          ? `${count} personnes de la communauté Upcomi ont raconté cet évènement.`
          : "Une personne de la communauté Upcomi a raconté cet évènement."}
      </p>
      <button type="button" onClick={onOpenAuth} className="btn-primary btn-small mt-4">
        Voir les retours d&apos;expérience
      </button>
    </div>
  );
}
