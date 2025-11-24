import React from 'react';
import { Helmet } from 'react-helmet-async';
import RendezVous from '../../../components/RendezVous';

const RendezVousPage = () => {

  return (
    <>
       <Helmet>
        <title>Rendez-Vous - Paname Consulting</title>
        <meta name="description" content="Prenez rendez-vous avec un conseiller Paname Consulting pour discuter de votre projet d'études à l'étranger." />
        <meta name="keywords" content="rendez-vous, études à l'étranger, conseiller, orientation" />
        <link rel="canonical" href="https://panameconsulting.com/rendez-vous" />
      </Helmet>

      <div className='flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y'>
        <RendezVous />
      </div>
    </>
  );
};

export default React.memo(RendezVousPage);
