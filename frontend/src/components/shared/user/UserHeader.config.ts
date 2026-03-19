import { User, Calendar, FileText } from "lucide-react";

export const pageConfigs = {
  "/mon-profil": {
    title: "Mon Profil",
    subtitle: "Gérez vos informations personnelles",
    pageTitle: "Mon Profil - Paname Consulting",
    description: "Gérez vos informations personnelles avec Paname Consulting",
  },
  "/mes-rendezvous": {
    title: "Mes Rendez-vous",
    subtitle: "Consultez et gérez vos rendez-vous",
    pageTitle: "Mes Rendez-vous - Paname Consulting",
    description: "Consultez et gérez vos rendez-vous avec Paname Consulting",
  },
  "/mes-procedures": {
    title: "Mes Procédures",
    subtitle: "Suivez l'avancement de vos dossiers",
    pageTitle: "Mes Procédures - Paname Consulting",
    description: "Suivez l'avancement de vos dossiers avec Paname Consulting",
  },
};

export const navTabs = [
  {
    id: "profile",
    label: "Profil",
    to: "/user/mon-profil",
    icon: User,
  },
  {
    id: "rendezvous",
    label: "RDV",
    to: "/user/mes-rendezvous",
    icon: Calendar,
  },
  {
    id: "procedures",
    label: "Procédure",
    to: "/user/mes-procedures",
    icon: FileText,
  },
];
