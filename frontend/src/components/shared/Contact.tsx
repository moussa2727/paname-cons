import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  AlertCircle,
  User,
  MessageSquare,
  Loader,
} from "lucide-react";
import { MessagesService } from "../../services/message.service";
import type { CreateContactDto } from "../../types/message.types";

const Contact: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreateContactDto>({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateContactDto, string>>
  >({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof CreateContactDto, boolean>>
  >({});
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Informations de contact
  const contactInfo = [
    {
      icon: <MapPin className="w-5 h-5 text-blue-100" />,
      title: "Adresse",
      content: "Kalaban Coura, Imm. Bore\nen face de l'hôtel Wassulu",
    },
    {
      icon: <Phone className="w-5 h-5 text-blue-100" />,
      title: "Téléphone",
      content: "+223 91 83 09 41",
      link: "tel:+22391830941",
    },
    {
      icon: <Mail className="w-5 h-5 text-blue-100" />,
      title: "Email",
      content: "panameconsulting906@gmail.com",
      link: "mailto:panameconsulting906@gmail.com",
    },
  ];

  // Validation des champs
  const validateField = (
    name: keyof CreateContactDto,
    value: string | undefined,
  ): string => {
    const strValue = String(value || "").trim();

    // Email - obligatoire
    if (name === "email") {
      if (!strValue) return "L'email est requis";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
        return "Email invalide";
      }
      return "";
    }

    // Message - obligatoire
    if (name === "message") {
      if (!strValue) return "Le message est requis";
      if (strValue.length < 10) {
        return "Le message doit contenir au moins 10 caractères";
      }
      if (strValue.length > 2000) {
        return "Le message ne peut pas dépasser 2000 caractères";
      }
      return "";
    }

    // Prénom - optionnel
    if (name === "firstName" && strValue) {
      if (strValue.length < 2) {
        return "Le prénom doit contenir au moins 2 caractères";
      }
      if (strValue.length > 50) {
        return "Le prénom ne peut pas dépasser 50 caractères";
      }
      if (!/^[a-zA-ZÀ-ÿ\s-]+$/.test(strValue)) {
        return "Caractères invalides (lettres, espaces et tirets uniquement)";
      }
    }

    // Nom - optionnel
    if (name === "lastName" && strValue) {
      if (strValue.length < 2) {
        return "Le nom doit contenir au moins 2 caractères";
      }
      if (strValue.length > 50) {
        return "Le nom ne peut pas dépasser 50 caractères";
      }
      if (!/^[a-zA-ZÀ-ÿ\s-]+$/.test(strValue)) {
        return "Caractères invalides (lettres, espaces et tirets uniquement)";
      }
    }

    return "";
  };

  // Validation complète du formulaire
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateContactDto, string>> = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof CreateContactDto>).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      message: true,
    });

    return isValid;
  };

  // Gestion du blur
  const handleBlur = (field: keyof CreateContactDto) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Gestion du changement
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Valider en temps réel si le champ a déjà été touché
    if (touched[name as keyof CreateContactDto]) {
      const error = validateField(name as keyof CreateContactDto, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll vers le premier champ en erreur
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        document.getElementById(firstError)?.focus();
      }
      return;
    }

    setIsLoading(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      await MessagesService.create(formData);

      setSubmitStatus({
        type: "success",
        message:
          "Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.",
      });

      // Réinitialiser le formulaire
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        message: "",
      });
      setErrors({});
      setTouched({});
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'envoi du message. Veuillez réessayer.";
      setSubmitStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset du message de statut après 5 secondes
  useEffect(() => {
    if (submitStatus.type) {
      const timer = setTimeout(() => {
        setSubmitStatus({ type: null, message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus.type]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contactez-nous
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Vous avez des questions sur nos services d'accompagnement ? Notre
            équipe est là pour vous répondre.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Section informations */}
            <div className="lg:col-span-1 bg-sky-500 text-white p-8 lg:p-10">
              <h2 className="text-2xl font-bold mb-8">Informations</h2>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex space-x-4">
                    <div className="shrink-0">
                      <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center">
                        {info.icon}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-blue-200">{info.title}</p>
                      {info.link ? (
                        <a
                          href={info.link}
                          className="text-white hover:text-blue-200 transition-colors"
                        >
                          {info.content}
                        </a>
                      ) : (
                        <p className="text-white whitespace-pre-line">
                          {info.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Carte Google Maps */}
              <div className="mt-8 rounded-lg overflow-hidden h-48">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3894.010270463331!2d-7.993864324930176!3d12.581574287699127!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xe51cf2248975979%3A0xa90fabf3b7838312!2sImmeuble%20BORE!5e0!3m2!1sfr!2sml!4v1700000000000!5m2!1sfr!2sml"
                  className="w-full h-full"
                  loading="lazy"
                  title="Localisation Paname Consulting"
                  style={{ border: 0 }}
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Formulaire */}
            <div className="lg:col-span-2 p-8 lg:p-10">
              {/* Message de statut */}
              {submitStatus.type && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
                    submitStatus.type === "success"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {submitStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <p
                    className={
                      submitStatus.type === "success"
                        ? "text-green-800"
                        : "text-red-800"
                    }
                  >
                    {submitStatus.message}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Prénom */}
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Prénom (optionnel)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        onBlur={() => handleBlur("firstName")}
                        disabled={isLoading}
                        className={`pl-10 w-full px-4 py-3 rounded-lg border ${
                          touched.firstName && errors.firstName
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300 bg-gray-50"
                        } hover:border-sky-500 focus:ring-none focus:border-blue-500 focus:outline-none transition-all`}
                        placeholder="Votre prénom"
                      />
                    </div>
                    {touched.firstName && errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Nom */}
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nom (optionnel)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        onBlur={() => handleBlur("lastName")}
                        disabled={isLoading}
                        className={`pl-10 w-full px-4 py-3 rounded-lg border ${
                          touched.lastName && errors.lastName
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300 bg-gray-50"
                        }  hover:border-sky-500 focus:ring-none focus:border-blue-500 focus:outline-none transition-all`}
                        placeholder="Votre nom"
                      />
                    </div>
                    {touched.lastName && errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email professionnel *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur("email")}
                      disabled={isLoading}
                      className={`pl-10 w-full px-4 py-3 rounded-lg border ${
                        touched.email && errors.email
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-gray-50"
                      }  hover:border-sky-500 focus:ring-none focus:border-blue-500 focus:outline-none transition-all`}
                      placeholder="exemple@entreprise.com"
                      required
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Message *
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                    </div>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      onBlur={() => handleBlur("message")}
                      disabled={isLoading}
                      className={`pl-10 w-full px-4 py-3 rounded-lg border ${
                        touched.message && errors.message
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-gray-50"
                      }  hover:border-sky-500 focus:ring-none focus:border-blue-500 focus:outline-none transition-all resize-none`}
                      placeholder="Votre message..."
                      required
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    {touched.message && errors.message ? (
                      <p className="text-sm text-red-600">{errors.message}</p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {formData.message.length}/2000 caractères
                      </p>
                    )}
                  </div>
                </div>

                {/* Bouton de soumission */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Envoyer le message</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  * Champs obligatoires. Les champs prénom et nom sont optionnels.
                  <br />
                  En envoyant ce message, vous acceptez le stockage et le traitement
                  de vos données selon les normes RGPD.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;