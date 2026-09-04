"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  MOCK_MY_FOLLOWER_IDS,
  MOCK_MY_FOLLOWING_IDS,
  MOCK_NOTIFICATIONS,
  type MockNotification,
} from "@/lib/social/mock-social";

/**
 * L'état de suivi de la maquette : qui je suis, qui me suit, et les demandes
 * en attente.
 *
 * **En mémoire uniquement.** Rien n'est écrit en base, rien n'est même écrit
 * dans le navigateur : un rechargement remet la maquette à son état initial.
 * C'est volontaire — on montre les gestes (suivre, ne plus suivre, accepter,
 * refuser) et ce qu'ils changent à l'écran, pas une persistance qui n'existe
 * pas encore.
 *
 * Au branchement, ce contexte devient le point d'entrée des écritures sur
 * `friendships` — qui n'a aujourd'hui **aucune policy d'insert ni de delete**
 * (voir `lib/social/mock-social`). Garder la forme de l'API : les composants
 * n'appellent que `isFollowing`, `toggleFollow` et les deux réponses aux
 * demandes.
 */
interface FollowContextValue {
  followingIds: string[];
  followerIds: string[];
  notifications: MockNotification[];
  unreadCount: number;
  isFollowing: (personId: string) => boolean;
  /** Renvoie l'état après le geste : `true` = désormais suivie. */
  toggleFollow: (personId: string) => boolean;
  respondToRequest: (notificationId: string, accept: boolean) => void;
  markNotificationsRead: () => void;
}

const FollowContext = createContext<FollowContextValue | null>(null);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [followingIds, setFollowingIds] = useState<string[]>(MOCK_MY_FOLLOWING_IDS);
  const [followerIds, setFollowerIds] = useState<string[]>(MOCK_MY_FOLLOWER_IDS);
  const [notifications, setNotifications] = useState<MockNotification[]>(MOCK_NOTIFICATIONS);

  const isFollowing = useCallback(
    (personId: string) => followingIds.includes(personId),
    [followingIds]
  );

  const toggleFollow = useCallback((personId: string) => {
    let nowFollowing = false;
    setFollowingIds((current) => {
      nowFollowing = !current.includes(personId);
      return nowFollowing
        ? [...current, personId]
        : current.filter((id) => id !== personId);
    });
    return nowFollowing;
  }, []);

  // Accepter une demande ajoute la personne à mes abonné·es ; refuser la
  // retire simplement de la liste. Dans les deux cas la notification
  // disparaît : elle appelait une décision, elle est prise.
  const respondToRequest = useCallback((notificationId: string, accept: boolean) => {
    setNotifications((current) => {
      const target = current.find((notification) => notification.id === notificationId);
      if (target && accept) {
        setFollowerIds((followers) =>
          followers.includes(target.personId) ? followers : [...followers, target.personId]
        );
      }
      return current.filter((notification) => notification.id !== notificationId);
    });
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );
  }, []);

  const value = useMemo<FollowContextValue>(
    () => ({
      followingIds,
      followerIds,
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
      isFollowing,
      toggleFollow,
      respondToRequest,
      markNotificationsRead,
    }),
    [
      followingIds,
      followerIds,
      notifications,
      isFollowing,
      toggleFollow,
      respondToRequest,
      markNotificationsRead,
    ]
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollow() {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error("useFollow doit être utilisé dans un FollowProvider");
  }
  return context;
}
