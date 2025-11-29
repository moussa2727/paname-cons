import { Helmet } from 'react-helmet-async';
import RendezVous from '../../../components/RendezVous';

const RendezVousPage = () => {
  return (
    <>
      <Helmet>
        <title>Rendez-Vous - Paname Consulting</title>
        <meta
          name='description'
          content="Prenez rendez-vous avec un conseiller Paname Consulting pour discuter de votre projet d&apos;études à l&apos;étranger."
        />
        <meta
          name='keywords'
          content="rendez-vous, études à l&apos;étranger, conseiller, orientation"
        />
        <link rel='canonical' href='https://panameconsulting.com/rendez-vous' />
        <meta name='robots' content='noindex, nofollow' />
        <meta name='googlebot' content='noindex, nofollow' />
        <meta name='bingbot' content='noindex, nofollow' />
        <meta name='yandexbot' content='noindex, nofollow' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
      </Helmet>

      <div className='flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y'>
        <RendezVous />
      </div>
    </>
  );
};

export default RendezVousPage;
