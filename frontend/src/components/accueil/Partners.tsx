interface Partner {
  id: number;
  name: string;
  location: string;
  image: string;
  link: string;
}

const partners: Partner[] = [
  {
    id: 1,
    name: "Supemir",
    location: "Casablanca, Maroc",
    image: "/images/supemir.webp",
    link: "https://www.supemir.com/",
  },
  {
    id: 2,
    name: "L'École Multimédia",
    location: "Paris, France",
    image: "/images/Ecolemultimediafrance.webp",
    link: "https://www.ecole-multimedia.com/",
  },
  {
    id: 3,
    name: "International Institute Ford Ghana",
    location: "Accra, Ghana",
    image: "/images/internationalinstitute.png",
    link: "https://visionfordgh.com/",
  },
  {
    id: 4,
    name: "Université de Chongqing",
    location: "Chongqing, Chine",
    image: "/images/universitechiongqing.png",
    link: "https://english.cqu.edu.cn/",
  },
  {
    id: 5,
    name: "HECF",
    location: "Fès, Maroc",
    image: "/images/hecf.webp",
    link: "https://hecf.ac.ma/",
  },
  {
    id: 6,
    name: "SUP'MANAGEMENT",
    location: "Fès, Maroc",
    image: "/images/supmanagement.webp",
    link: "https://www.supmanagement.ma/",
  },
  {
    id: 7,
    name: "Univers France Succès",
    location: "Sarcelles, France",
    image: "/images/francesucces.webp",
    link: "https://universfrancesucces.com/",
  },
  {
    id: 8,
    name: "Inted Group",
    location: "Paris, France",
    image: "/images/inted.webp",
    link: "https://www.intedgroup.com/",
  },
];

const randomStyles = [
  "rotate-2 -translate-y-6",
  "-rotate-3 translate-y-8",
  "rotate-6 translate-x-4",
  "-rotate-2 -translate-x-8",
  "rotate-1 translate-y-4",
  "-rotate-6 -translate-y-6",
];

export default function Partners() {
  return (
    <section className="py-32 bg-sky-50 overflow-hidden">
      <div className="container mx-auto px-4 text-center mb-24">
        <h2 className="text-5xl font-black text-sky-900 italic uppercase tracking-widest">
          Network
        </h2>
        <p className="text-sky-500 font-bold mt-2">
          Nos partenaires à travers le monde
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-24 max-w-7xl mx-auto">
        {partners.map((partner, index) => (
          <div
            key={partner.id}
            className={`transition-all duration-700 ease-out hover:rotate-0 hover:scale-110 hover:z-20
                       ${randomStyles[index % randomStyles.length]}`}
          >
            <a
              href={partner.link}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block w-72 h-48 overflow-hidden rounded-2xl shadow-2xl shadow-sky-900/20 group"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={partner.image}
                  alt={partner.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-125"
                />
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end p-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                  <h3 className="text-lg font-bold text-sky-900 tracking-tight group-hover:text-sky-700 transition-colors">
                    {partner.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-medium text-sky-600 uppercase tracking-tighter">
                      {partner.location}
                    </p>
                  </div>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
