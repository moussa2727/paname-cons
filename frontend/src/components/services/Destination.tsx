import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Destination } from "../../types/destination.types";

const FALLBACK_IMAGE = "/images/paname-consulting.png";

const defaultDestinations: Destination[] = [
  {
    id: "1",
    country: "Russie",
    imagePath: "/images/russie.png",
    text: "La Russie propose un enseignement supérieur d'excellence avec des universités historiques comme MGU. Système éducatif combinant tradition et recherche de pointe dans un environnement multiculturel. Coûts de scolarité très compétitifs et bourses disponibles pour étudiants internationaux.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    country: "Chine",
    imagePath: "/images/chine.jpg",
    text: "La Chine développe des pôles universitaires high-tech avec des programmes innovants en IA et commerce international. Universités comme Tsinghua rivalisent avec les meilleures mondiales. Cours en anglais disponibles avec des partenariats industriels solides.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    country: "Maroc",
    imagePath: "/images/maroc.webp",
    text: "Le Maroc offre un enseignement de qualité en français/arabe avec des frais accessibles. Universités reconnues en Afrique et programmes d'échange avec l'Europe. Environnement sécurisé et cadre de vie agréable.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    country: "Algérie",
    imagePath: "/images/algerie.png",
    text: "L'Algérie dispose d'universités performantes en sciences et médecine avec des coûts très abordables. Système éducatif francophone et infrastructures récentes. Opportunités de recherche dans les énergies renouvelables et la pharmacologie.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    country: "Turquie",
    imagePath: "/images/turquie.webp",
    text: "La Turquie combine éducation de qualité et frais modestes avec des universités accréditées internationalement. Position géographique unique entre Europe et Asie. Programmes en anglais avec spécialisation en ingénierie et relations internationales.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "6",
    country: "France",
    imagePath: "/images/france.svg",
    text: "La France maintient sa tradition d'excellence académique avec des universités historiques et grandes écoles renommées. Réseau d'anciens élèves influents et forte employabilité internationale. Vie culturelle riche et nombreuses bourses disponibles.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const resolveImage = (dest: Destination): string => {
  if (dest.imageUrl && dest.imageUrl.startsWith("http")) return dest.imageUrl;
  if (dest.imagePath) return dest.imagePath;
  return FALLBACK_IMAGE;
};

const DestinationCard: React.FC<Destination> = (props) => {
  const { id, country, text } = props;
  const [expanded, setExpanded] = useState(false);
  const [imgSrc, setImgSrc] = useState(resolveImage(props));
  const isLong = text.length > 120;
  const displayText = expanded || !isLong ? text : text.slice(0, 120) + "…";

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 hover:-translate-y-1">
      <div className="relative h-52 overflow-hidden bg-slate-200">
        <img
          src={imgSrc}
          alt={country}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => {
            if (imgSrc !== FALLBACK_IMAGE) {
              setImgSrc(FALLBACK_IMAGE);
            }
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4">
          <span className="bg-white/95 backdrop-blur-sm text-slate-800 text-sm font-bold px-3 py-1 rounded-full shadow-md tracking-wide">
            {country}
          </span>
        </div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="text-slate-600 text-sm leading-relaxed">
          {displayText}
          {isLong && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              className="ml-1 text-sky-500 hover:text-sky-700 font-medium text-sm transition-colors"
            >
              {expanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100">
          <Link
            to={`/rendezvous?destinationId=${id}`}
            className="flex items-center justify-between w-full group/btn"
          >
            <span className="text-sm font-semibold text-slate-700 group-hover/btn:text-sky-600 transition-colors">
              Prendre rendez-vous
            </span>
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 group-hover/btn:bg-sky-500 transition-all duration-300">
              <svg
                className="w-4 h-4 text-sky-500 group-hover/btn:text-white transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
    <div className="h-52 bg-slate-200" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-200 rounded w-full" />
      <div className="h-4 bg-slate-200 rounded w-5/6" />
      <div className="pt-3 border-t border-slate-100">
        <div className="h-8 bg-slate-200 rounded" />
      </div>
    </div>
  </div>
);

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

const DestinationComponent = () => {
  const [destinations, setDestinations] =
    useState<Destination[]>(defaultDestinations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/destinations/all`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          const text = await response.text();
          console.error(
            `[Destinations] HTTP ${response.status}:`,
            text.slice(0, 200),
          );
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();

        let raw: unknown[] = [];
        if (Array.isArray(data)) raw = data;
        else if (Array.isArray(data.data)) raw = data.data;
        else if (Array.isArray(data.destinations)) raw = data.destinations;
        else {
          setDestinations(defaultDestinations);
          return;
        }

        const mapped: Destination[] = raw.map((d: unknown) => {
          const item = d as Record<string, unknown>;
          return {
            id:
              (item.id as string) ??
              (item._id as string) ??
              String(Math.random()),
            country:
              (item.country as string) ??
              (item.name as string) ??
              "Pays inconnu",
            imagePath: (item.imagePath as string) ?? "",
            imageUrl: (item.imageUrl as string) ?? undefined,
            text:
              (item.text as string) ??
              (item.description as string) ??
              (item.content as string) ??
              "Description non disponible",
            createdAt: (item.createdAt as Date) ?? new Date(),
            updatedAt: (item.updatedAt as Date) ?? new Date(),
          };
        });

        setDestinations(mapped.length ? mapped : defaultDestinations);
      } catch (err) {
        console.error("Erreur chargement destinations:", err);
        setDestinations(defaultDestinations);
      } finally {
        setLoading(false);
      }
    };

    fetchDestinations();
  }, []);

  return (
    <section className="py-20 px-4 bg-gray-100/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-sky-500 text-sm font-semibold tracking-widest uppercase mb-3">
            Nos destinations
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
            Où souhaitez-vous{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-500 to-blue-600">
              étudier ?
            </span>
          </h2>
          <p className="mt-4 text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
            Choisissez votre destination et laissez-nous vous accompagner dans
            votre projet d'études à l'étranger.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {loading
            ? [1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)
            : destinations.map((dest) => (
                <DestinationCard key={dest.id} {...dest} />
              ))}
        </div>
      </div>
    </section>
  );
};

export default DestinationComponent;
