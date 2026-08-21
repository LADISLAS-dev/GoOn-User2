import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Linking,
  Pressable,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../services/authService';

const GUEST_LABELS = {
  fr: "Continuer en tant qu'invité",
  en: 'Continue as Guest',
  es: 'Continuar como invitado',
  pt: 'Continuar como convidado',
  zh: '以访客身份继续',
  hi: 'अतिथि के रूप में जारी रखें',
  ar: 'المتابعة كضيف',
  bn: 'অতিথি হিসেবে চালিয়ে যান',
  ru: 'Продолжить как гость',
  ja: 'ゲストとして続ける',
  de: 'Als Gast fortfahren',
  id: 'Lanjutkan sebagai tamu',
  ur: 'مہمان کے طور پر جاری رکھیں',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { login, isLoading, continueAsGuest } = useUser();
  const { t, language } = useLanguage();
  const isFrench = language === 'fr';
  const legalLang = language === 'es' || language === 'pt' || language === 'ar' ? language : null;

  const LEGAL_TRANSLATIONS = {
    es: {
      'Privacy Policy': 'Politica de Privacidad',
      'Last updated: July 22, 2026': 'Ultima actualizacion: 22 de julio de 2026',
      'Terms of Service': 'Terminos del Servicio',
      'Last updated: August 05, 2026': 'Ultima actualizacion: 05 de agosto de 2026',
      'Cookie Policy': 'Politica de Cookies',
      Contents: 'Contenido',
      '1. Introduction': '1. Introduccion',
      '2. Information We Collect': '2. Informacion que recopilamos',
      '3. How We Use Information': '3. Como usamos la informacion',
      '4. Location Information': '4. Informacion de ubicacion',
      '5. User Generated Content': '5. Contenido generado por usuarios',
      '6. Data Sharing': '6. Comparticion de datos',
      '7. Third-Party Services': '7. Servicios de terceros',
      '8. Data Security': '8. Seguridad de datos',
      '9. Data Retention and Account Deletion': '9. Retencion de datos y eliminacion de cuenta',
      '10. Children\'s Privacy': '10. Privacidad de menores',
      '11. Your Privacy Rights': '11. Tus derechos de privacidad',
      '12. Changes to This Privacy Policy': '12. Cambios en esta politica de privacidad',
      '13. Contact Information': '13. Informacion de contacto',
      'We collect the following categories of information:': 'Recopilamos las siguientes categorias de informacion:',
      'We use the information we collect to:': 'Usamos la informacion recopilada para:',
      'Depending on your location, you may have the right to:': 'Segun tu ubicacion, puedes tener derecho a:',
      'GoOn Support': 'Soporte GoOn',
      'GoOn is a local business discovery and booking platform that connects customers with local businesses. Through the GoOn mobile application, customers can discover businesses, view profiles, exchange messages, book appointments, leave reviews, and receive notifications. Businesses can manage their profiles, communicate with customers, manage appointments, and promote their services.': 'GoOn es una plataforma local de descubrimiento de negocios y reservas que conecta clientes con negocios locales. A traves de la aplicacion movil GoOn, los clientes pueden descubrir negocios, ver perfiles, intercambiar mensajes, reservar citas, dejar resenas y recibir notificaciones. Los negocios pueden gestionar sus perfiles, comunicarse con clientes, administrar citas y promocionar sus servicios.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Tu privacidad es importante para nosotros. Esta Politica de Privacidad explica que informacion recopilamos, como la usamos y que opciones tienes. Al usar GoOn, aceptas las practicas descritas en esta politica.',
      'Account information: such as your name, email address, and phone number (if provided).': 'Informacion de cuenta: como tu nombre, correo electronico y numero de telefono (si se proporciona).',
      'Profile information: details you add to your customer or business profile.': 'Informacion de perfil: detalles que agregas a tu perfil de cliente o negocio.',
      'Business information: information provided by business accounts, including services, hours, and contact details.': 'Informacion del negocio: datos de cuentas empresariales, incluidos servicios, horarios y contacto.',
      'Location data: collected only when you allow location access through your device.': 'Datos de ubicacion: recopilados solo cuando permites acceso desde tu dispositivo.',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'Mensajes y comunicaciones: mensajes entre clientes y negocios dentro de la app.',
      'Appointment and booking information: details related to appointments you book or receive.': 'Informacion de citas y reservas: detalles de citas que reservas o recibes.',
      'Reviews and ratings: content you submit about businesses.': 'Resenas y calificaciones: contenido que envias sobre negocios.',
      'Photos: images uploaded by users or businesses.': 'Fotos: imagenes cargadas por usuarios o negocios.',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'Informacion del dispositivo y datos tecnicos: modelo, sistema operativo, version de la app y diagnosticos.',
      'Push notification information: tokens and preferences used to deliver notifications.': 'Informacion de notificaciones push: tokens y preferencias para enviar notificaciones.',
      'Create and manage user and business accounts.': 'Crear y administrar cuentas de usuarios y negocios.',
      'Connect customers with local businesses.': 'Conectar clientes con negocios locales.',
      'Provide messaging, booking, and related services.': 'Ofrecer mensajeria, reservas y servicios relacionados.',
      'Improve app functionality, reliability, and user experience.': 'Mejorar funcionalidad, fiabilidad y experiencia de usuario.',
      'Send notifications relevant to your activity and preferences.': 'Enviar notificaciones segun tu actividad y preferencias.',
      'Maintain the security and integrity of the platform.': 'Mantener la seguridad e integridad de la plataforma.',
      'Provide customer support and respond to inquiries.': 'Brindar soporte y responder consultas.',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'Con tu permiso, usamos la ubicacion de tu dispositivo para ayudarte a descubrir negocios cercanos y mejorar los resultados locales.',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'Puedes activar o desactivar el acceso a la ubicacion en cualquier momento desde la configuracion de tu dispositivo. Desactivarlo puede limitar algunas funciones de la app.',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'Los usuarios y negocios pueden enviar contenido a GoOn, incluyendo resenas, fotos, datos de perfil y mensajes.',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'Eres responsable del contenido que publicas y de asegurar que cumpla con las leyes aplicables y nuestras politicas. GoOn puede eliminar contenido que infrinja nuestras politicas o la ley.',
      'GoOn does not sell your personal information.': 'GoOn no vende tu informacion personal.',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'Podemos compartir informacion con proveedores de confianza que nos ayudan a operar la app, incluyendo alojamiento, autenticacion, base de datos y notificaciones. Estos proveedores solo pueden usar tu informacion para prestar esos servicios.',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'Tambien podemos divulgar informacion cuando la ley lo exija, por proceso legal o para proteger los derechos, la seguridad y la propiedad de GoOn, nuestros usuarios u otros.',
      'GoOn may use third-party services to support the app. These services may include:': 'GoOn puede usar servicios de terceros para respaldar la app. Estos servicios pueden incluir:',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'Aplicamos medidas tecnicas y organizativas razonables para proteger tu informacion contra acceso, divulgacion, alteracion o destruccion no autorizados.',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'Sin embargo, ningun metodo de transmision por internet o almacenamiento electronico es 100% seguro, y no podemos garantizar seguridad absoluta.',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'Puedes solicitar la eliminacion de tu cuenta y datos personales asociados en cualquier momento contactandonos.',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'Parte de la informacion puede conservarse tras eliminar la cuenta cuando sea necesario para cumplir obligaciones legales, resolver disputas, prevenir fraude o hacer cumplir acuerdos.',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'GoOn no esta disenada para menores de 13 anos. No recopilamos intencionalmente informacion personal de menores de 13 anos.',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'Si crees que un menor nos ha proporcionado informacion personal, contactanos para tomar las medidas adecuadas y eliminarla.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Podemos actualizar esta Politica de Privacidad periodicamente. Cuando haya cambios materiales, te avisaremos por la app o en nuestro sitio web. El uso continuo de GoOn despues de una actualizacion implica tu aceptacion de la politica revisada.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'Al acceder o usar GoOn, aceptas quedar vinculado por estos Terminos del Servicio. Si no estas de acuerdo, no uses la aplicacion.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn es una plataforma local de descubrimiento de negocios, mensajeria y reservas para clientes y negocios.',
      'You must provide accurate and current information.': 'Debes proporcionar informacion precisa y actual.',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'Eres responsable de mantener la confidencialidad de tus credenciales.',
      'You are responsible for activities under your account.': 'Eres responsable de las actividades realizadas desde tu cuenta.',
      'Do not misuse, disrupt, or reverse engineer the service.': 'No hagas uso indebido, no interrumpas ni intentes ingenieria inversa del servicio.',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'No publiques contenido ilegal, abusivo, fraudulento o que infrinja derechos.',
      'Do not attempt unauthorized access to systems or data.': 'No intentes acceso no autorizado a sistemas o datos.',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'Los negocios y usuarios conservan la propiedad de su contenido. Al enviarlo a GoOn, nos otorgas una licencia limitada para alojarlo, mostrarlo y procesarlo solo para operar el servicio.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn facilita reservas y comunicaciones entre clientes y negocios. GoOn no es parte de la prestacion de servicios de negocios independientes.',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'Podemos suspender o cerrar cuentas que violen estos terminos, la ley aplicable o requisitos de seguridad de la plataforma.',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'El servicio se ofrece "tal cual" y "segun disponibilidad", sin garantias de ningun tipo, en la medida permitida por la ley.',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'En la maxima medida permitida por la ley, GoOn no sera responsable por danos indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso del servicio.',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'Podemos actualizar estos terminos periodicamente. El uso continuo de GoOn despues de actualizaciones constituye aceptacion de los terminos revisados.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Las cookies y tecnologias similares son pequenos identificadores usados para mejorar confiabilidad, seguridad y usabilidad en nuestro ecosistema.',
      'Authentication and session continuity.': 'Autenticacion y continuidad de sesion.',
      'Security monitoring and fraud prevention.': 'Monitoreo de seguridad y prevencion de fraude.',
      'App performance and reliability diagnostics.': 'Rendimiento de la app y diagnostico de fiabilidad.',
      'Notification and preference management.': 'Gestion de notificaciones y preferencias.',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'En movil, estas tecnologias pueden incluir tokens de almacenamiento local e identificadores del dispositivo para inicio de sesion seguro y notificaciones push.',
      'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': 'Puedes gestionar permisos desde la configuracion del dispositivo. Desactivar ciertos permisos puede reducir o deshabilitar funciones como notificaciones, descubrimiento por ubicacion o sesiones persistentes.',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'Podemos actualizar esta Politica de Cookies para reflejar cambios tecnologicos, legales o de producto.',
      'Firebase services': 'Servicios Firebase',
      'Cloud hosting providers': 'Proveedores de alojamiento en la nube',
      'Database services': 'Servicios de base de datos',
      'Push notification services': 'Servicios de notificaciones push',
      'Analytics and crash reporting, if enabled': 'Analitica y reportes de fallos, si estan habilitados',
      'Access the personal information we hold about you.': 'Acceder a la informacion personal que tenemos sobre ti.',
      'Update or correct your information.': 'Actualizar o corregir tu informacion.',
      'Request deletion of your account or personal data.': 'Solicitar eliminacion de tu cuenta o datos personales.',
      'Contact GoOn regarding privacy questions or concerns.': 'Contactar a GoOn sobre dudas o inquietudes de privacidad.',
      'For legal inquiries: idealcrea@gmail.com': 'Para consultas legales: idealcrea@gmail.com',
      'For cookie-related questions: idealcrea@gmail.com': 'Para consultas sobre cookies: idealcrea@gmail.com',
      '1. Acceptance of Terms': '1. Aceptacion de terminos',
      '2. Description of Service': '2. Descripcion del servicio',
      '3. Account Responsibilities': '3. Responsabilidades de cuenta',
      '4. Acceptable Use': '4. Uso aceptable',
      '5. Business Content and User Content': '5. Contenido de negocios y usuarios',
      '6. Bookings and Communications': '6. Reservas y comunicaciones',
      '7. Suspension and Termination': '7. Suspension y terminacion',
      '8. Disclaimer of Warranties': '8. Exclusion de garantias',
      '9. Limitation of Liability': '9. Limitacion de responsabilidad',
      '10. Changes to Terms': '10. Cambios en los terminos',
      '11. Contact': '11. Contacto',
      '1. What Are Cookies and Similar Technologies': '1. Que son las cookies y tecnologias similares',
      '2. How GoOn Uses Them': '2. Como GoOn las utiliza',
      '3. Mobile Environment': '3. Entorno movil',
      '4. Your Choices': '4. Tus opciones',
      '5. Updates': '5. Actualizaciones',
      '6. Contact': '6. Contacto',
    },
    pt: {
      'Privacy Policy': 'Politica de Privacidade',
      'Last updated: July 22, 2026': 'Ultima atualizacao: 22 de julho de 2026',
      'Terms of Service': 'Termos de Servico',
      'Last updated: August 05, 2026': 'Ultima atualizacao: 05 de agosto de 2026',
      'Cookie Policy': 'Politica de Cookies',
      Contents: 'Conteudo',
      '1. Introduction': '1. Introducao',
      '2. Information We Collect': '2. Informacoes que coletamos',
      '3. How We Use Information': '3. Como usamos as informacoes',
      '4. Location Information': '4. Informacoes de localizacao',
      '5. User Generated Content': '5. Conteudo gerado pelo usuario',
      '6. Data Sharing': '6. Compartilhamento de dados',
      '7. Third-Party Services': '7. Servicos de terceiros',
      '8. Data Security': '8. Seguranca de dados',
      '9. Data Retention and Account Deletion': '9. Retencao de dados e exclusao de conta',
      '10. Children\'s Privacy': '10. Privacidade de criancas',
      '11. Your Privacy Rights': '11. Seus direitos de privacidade',
      '12. Changes to This Privacy Policy': '12. Alteracoes nesta politica de privacidade',
      '13. Contact Information': '13. Informacoes de contato',
      'We collect the following categories of information:': 'Coletamos as seguintes categorias de informacao:',
      'We use the information we collect to:': 'Usamos as informacoes coletadas para:',
      'Depending on your location, you may have the right to:': 'Dependendo da sua localizacao, voce pode ter o direito de:',
      'GoOn Support': 'Suporte GoOn',
      'GoOn is a local business discovery and booking platform that connects customers with local businesses. Through the GoOn mobile application, customers can discover businesses, view profiles, exchange messages, book appointments, leave reviews, and receive notifications. Businesses can manage their profiles, communicate with customers, manage appointments, and promote their services.': 'GoOn e uma plataforma local de descoberta de negocios e agendamento que conecta clientes a negocios locais. Pelo aplicativo movel GoOn, clientes podem descobrir negocios, ver perfis, trocar mensagens, agendar compromissos, deixar avaliacoes e receber notificacoes. Negocios podem gerenciar perfis, comunicar-se com clientes, gerenciar compromissos e promover servicos.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Sua privacidade e importante para nos. Esta Politica de Privacidade explica quais informacoes coletamos, como usamos e quais opcoes voce possui. Ao usar GoOn, voce concorda com as praticas descritas nesta politica.',
      'Account information: such as your name, email address, and phone number (if provided).': 'Informacoes de conta: como nome, email e telefone (se informado).',
      'Profile information: details you add to your customer or business profile.': 'Informacoes de perfil: detalhes adicionados ao perfil de cliente ou negocio.',
      'Business information: information provided by business accounts, including services, hours, and contact details.': 'Informacoes do negocio: dados fornecidos por contas empresariais, incluindo servicos, horarios e contato.',
      'Location data: collected only when you allow location access through your device.': 'Dados de localizacao: coletados somente quando voce permite acesso no dispositivo.',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'Mensagens e comunicacoes: mensagens trocadas entre clientes e negocios no app.',
      'Appointment and booking information: details related to appointments you book or receive.': 'Informacoes de agendamentos e reservas: detalhes dos compromissos marcados ou recebidos.',
      'Reviews and ratings: content you submit about businesses.': 'Avaliacoes e notas: conteudo enviado sobre negocios.',
      'Photos: images uploaded by users or businesses.': 'Fotos: imagens enviadas por usuarios ou negocios.',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'Informacoes do dispositivo e dados tecnicos: modelo, sistema operacional, versao do app e diagnosticos.',
      'Push notification information: tokens and preferences used to deliver notifications.': 'Informacoes de notificacoes push: tokens e preferencias usados para enviar notificacoes.',
      'Create and manage user and business accounts.': 'Criar e gerenciar contas de usuarios e negocios.',
      'Connect customers with local businesses.': 'Conectar clientes a negocios locais.',
      'Provide messaging, booking, and related services.': 'Fornecer mensageria, reservas e servicos relacionados.',
      'Improve app functionality, reliability, and user experience.': 'Melhorar funcionalidade, confiabilidade e experiencia do usuario.',
      'Send notifications relevant to your activity and preferences.': 'Enviar notificacoes relevantes para sua atividade e preferencias.',
      'Maintain the security and integrity of the platform.': 'Manter seguranca e integridade da plataforma.',
      'Provide customer support and respond to inquiries.': 'Oferecer suporte ao cliente e responder solicitacoes.',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'Com sua permissao, usamos a localizacao do dispositivo para ajudar voce a descobrir negocios proximos e melhorar resultados locais.',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'Voce pode ativar ou desativar o acesso a localizacao a qualquer momento nas configuracoes do dispositivo. Desativar pode limitar alguns recursos do app.',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'Usuarios e negocios podem enviar conteudo para GoOn, incluindo avaliacoes, fotos, detalhes de perfil e mensagens.',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'Voce e responsavel pelo conteudo que envia e por garantir conformidade com leis aplicaveis e nossas politicas. GoOn pode remover conteudo que viole politicas ou a lei.',
      'GoOn does not sell your personal information.': 'A GoOn nao vende suas informacoes pessoais.',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'Podemos compartilhar informacoes com provedores confiaveis que ajudam a operar o app, incluindo hospedagem, autenticacao, banco de dados e notificacoes. Esses provedores so podem usar informacoes conforme necessario para prestar servicos.',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'Tambem podemos divulgar informacoes quando exigido por lei, processo legal, ou para proteger direitos, seguranca e propriedade da GoOn, usuarios ou terceiros.',
      'GoOn may use third-party services to support the app. These services may include:': 'A GoOn pode usar servicos de terceiros para apoiar o app. Esses servicos podem incluir:',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'Usamos medidas tecnicas e organizacionais razoaveis para proteger suas informacoes contra acesso, divulgacao, alteracao ou destruicao nao autorizados.',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'No entanto, nenhum metodo de transmissao pela internet ou armazenamento eletronico e 100% seguro, e nao podemos garantir seguranca absoluta.',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'Voce pode solicitar a exclusao da sua conta e dos dados pessoais associados a qualquer momento entrando em contato conosco.',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'Algumas informacoes podem ser retidas apos exclusao da conta quando necessario para cumprir obrigacoes legais, resolver disputas, prevenir fraude ou executar acordos.',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'A GoOn nao foi projetada para criancas menores de 13 anos. Nao coletamos intencionalmente informacoes pessoais de menores de 13 anos.',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'Se voce acredita que uma crianca nos forneceu informacoes pessoais, entre em contato para tomarmos medidas apropriadas de remocao.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Podemos atualizar esta Politica de Privacidade periodicamente. Quando houver mudancas materiais, notificaremos voce pelo app ou site. O uso continuo da GoOn apos uma atualizacao significa aceitacao da politica revisada.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'Ao acessar ou usar GoOn, voce concorda em ficar vinculado a estes Termos de Servico. Se nao concordar, nao use o aplicativo.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn e uma plataforma local de descoberta de negocios, mensagens e agendamentos para clientes e negocios.',
      'You must provide accurate and current information.': 'Voce deve fornecer informacoes precisas e atualizadas.',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'Voce e responsavel por manter a confidencialidade das credenciais da conta.',
      'You are responsible for activities under your account.': 'Voce e responsavel pelas atividades realizadas em sua conta.',
      'Do not misuse, disrupt, or reverse engineer the service.': 'Nao use indevidamente, nao interrompa e nao faca engenharia reversa do servico.',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'Nao envie conteudo ilegal, abusivo, fraudulento ou que infrinja direitos.',
      'Do not attempt unauthorized access to systems or data.': 'Nao tente acesso nao autorizado a sistemas ou dados.',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'Negocios e usuarios mantem a propriedade do proprio conteudo. Ao enviar conteudo para GoOn, voce concede licenca limitada para hospedar, exibir e processar somente para operar o servico.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'A GoOn facilita agendamentos e comunicacoes entre clientes e negocios. A GoOn nao e parte na execucao de servicos de negocios independentes.',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'Podemos suspender ou encerrar contas que violem estes termos, a lei aplicavel ou requisitos de seguranca da plataforma.',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'O servico e fornecido "no estado em que se encontra" e "conforme disponibilidade", sem garantias de qualquer tipo, na extensao permitida por lei.',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'Na maxima extensao permitida por lei, GoOn nao sera responsavel por danos indiretos, incidentais, especiais, consequenciais ou punitivos decorrentes do uso do servico.',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'Podemos atualizar estes termos periodicamente. O uso continuo da GoOn apos atualizacoes constitui aceitacao dos termos revisados.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Cookies e tecnologias similares sao pequenos identificadores usados para melhorar confiabilidade, seguranca e usabilidade em nosso ecossistema de app.',
      'Authentication and session continuity.': 'Autenticacao e continuidade de sessao.',
      'Security monitoring and fraud prevention.': 'Monitoramento de seguranca e prevencao de fraude.',
      'App performance and reliability diagnostics.': 'Desempenho do app e diagnostico de confiabilidade.',
      'Notification and preference management.': 'Gerenciamento de notificacoes e preferencias.',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'No ambiente movel, essas tecnologias podem incluir tokens de armazenamento local e identificadores do dispositivo para login seguro e notificacoes push.',
      'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': 'Voce pode gerenciar permissoes nas configuracoes do dispositivo. Desativar certas permissoes pode reduzir ou desativar recursos como notificacoes, descoberta por localizacao ou sessoes persistentes.',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'Podemos atualizar esta Politica de Cookies para refletir mudancas tecnologicas, legais ou de produto.',
      'Firebase services': 'Servicos Firebase',
      'Cloud hosting providers': 'Provedores de hospedagem em nuvem',
      'Database services': 'Servicos de banco de dados',
      'Push notification services': 'Servicos de notificacao push',
      'Analytics and crash reporting, if enabled': 'Analitica e relatorios de falhas, se habilitados',
      'Access the personal information we hold about you.': 'Acessar as informacoes pessoais que mantemos sobre voce.',
      'Update or correct your information.': 'Atualizar ou corrigir suas informacoes.',
      'Request deletion of your account or personal data.': 'Solicitar exclusao da sua conta ou dados pessoais.',
      'Contact GoOn regarding privacy questions or concerns.': 'Contatar a GoOn sobre duvidas ou preocupacoes de privacidade.',
      'For legal inquiries: idealcrea@gmail.com': 'Para assuntos legais: idealcrea@gmail.com',
      'For cookie-related questions: idealcrea@gmail.com': 'Para questoes sobre cookies: idealcrea@gmail.com',
      '1. Acceptance of Terms': '1. Aceitacao dos termos',
      '2. Description of Service': '2. Descricao do servico',
      '3. Account Responsibilities': '3. Responsabilidades da conta',
      '4. Acceptable Use': '4. Uso aceitavel',
      '5. Business Content and User Content': '5. Conteudo de negocios e usuarios',
      '6. Bookings and Communications': '6. Reservas e comunicacoes',
      '7. Suspension and Termination': '7. Suspensao e encerramento',
      '8. Disclaimer of Warranties': '8. Isencao de garantias',
      '9. Limitation of Liability': '9. Limitacao de responsabilidade',
      '10. Changes to Terms': '10. Alteracoes dos termos',
      '11. Contact': '11. Contato',
      '1. What Are Cookies and Similar Technologies': '1. O que sao cookies e tecnologias similares',
      '2. How GoOn Uses Them': '2. Como a GoOn os utiliza',
      '3. Mobile Environment': '3. Ambiente movel',
      '4. Your Choices': '4. Suas escolhas',
      '5. Updates': '5. Atualizacoes',
      '6. Contact': '6. Contato',
    },
    ar: {
      'Privacy Policy': 'سياسة الخصوصية',
      'Last updated: July 22, 2026': 'آخر تحديث: 22 يوليو 2026',
      'Terms of Service': 'شروط الخدمة',
      'Last updated: August 05, 2026': 'آخر تحديث: 05 أغسطس 2026',
      'Cookie Policy': 'سياسة ملفات تعريف الارتباط',
      Contents: 'المحتويات',
      '1. Introduction': '1. مقدمة',
      '2. Information We Collect': '2. المعلومات التي نجمعها',
      '3. How We Use Information': '3. كيف نستخدم المعلومات',
      '4. Location Information': '4. معلومات الموقع',
      '5. User Generated Content': '5. المحتوى الذي ينشئه المستخدم',
      '6. Data Sharing': '6. مشاركة البيانات',
      '7. Third-Party Services': '7. خدمات الطرف الثالث',
      '8. Data Security': '8. أمن البيانات',
      '9. Data Retention and Account Deletion': '9. الاحتفاظ بالبيانات وحذف الحساب',
      '10. Children\'s Privacy': '10. خصوصية الأطفال',
      '11. Your Privacy Rights': '11. حقوقك في الخصوصية',
      '12. Changes to This Privacy Policy': '12. التغييرات على سياسة الخصوصية هذه',
      '13. Contact Information': '13. معلومات الاتصال',
      'We collect the following categories of information:': 'نجمع الفئات التالية من المعلومات:',
      'We use the information we collect to:': 'نستخدم المعلومات التي نجمعها من أجل:',
      'Depending on your location, you may have the right to:': 'بحسب موقعك، قد يكون لديك الحق في:',
      'GoOn Support': 'دعم GoOn',
      'GoOn is a local business discovery and booking platform that connects customers with local businesses. Through the GoOn mobile application, customers can discover businesses, view profiles, exchange messages, book appointments, leave reviews, and receive notifications. Businesses can manage their profiles, communicate with customers, manage appointments, and promote their services.': 'GoOn منصة محلية لاكتشاف الأعمال والحجوزات تربط العملاء بالأنشطة المحلية. من خلال تطبيق GoOn على الهاتف، يمكن للعملاء اكتشاف الأنشطة، عرض الملفات الشخصية، تبادل الرسائل، حجز المواعيد، ترك المراجعات، وتلقي الإشعارات. ويمكن للأنشطة إدارة ملفاتها الشخصية، والتواصل مع العملاء، وإدارة المواعيد، والترويج لخدماتها.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'خصوصيتك مهمة بالنسبة لنا. توضح سياسة الخصوصية هذه ما المعلومات التي نجمعها، وكيف نستخدمها، والخيارات المتاحة لك. باستخدام GoOn، فإنك توافق على الممارسات الموضحة في هذه السياسة.',
      'Account information: such as your name, email address, and phone number (if provided).': 'معلومات الحساب: مثل الاسم والبريد الإلكتروني ورقم الهاتف (إن تم تقديمه).',
      'Profile information: details you add to your customer or business profile.': 'معلومات الملف الشخصي: التفاصيل التي تضيفها إلى ملفك الشخصي كعميل أو نشاط تجاري.',
      'Business information: information provided by business accounts, including services, hours, and contact details.': 'معلومات النشاط التجاري: المعلومات التي تقدمها حسابات الأعمال، بما في ذلك الخدمات وساعات العمل وبيانات التواصل.',
      'Location data: collected only when you allow location access through your device.': 'بيانات الموقع: يتم جمعها فقط عند السماح بالوصول إلى الموقع عبر جهازك.',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'الرسائل والتواصل: الرسائل المتبادلة بين العملاء والأنشطة عبر التطبيق.',
      'Appointment and booking information: details related to appointments you book or receive.': 'معلومات المواعيد والحجوزات: التفاصيل المتعلقة بالمواعيد التي تحجزها أو تتلقاها.',
      'Reviews and ratings: content you submit about businesses.': 'المراجعات والتقييمات: المحتوى الذي ترسله حول الأنشطة.',
      'Photos: images uploaded by users or businesses.': 'الصور: الصور التي يرفعها المستخدمون أو الأنشطة.',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'معلومات الجهاز والبيانات التقنية: مثل طراز الجهاز، ونظام التشغيل، وإصدار التطبيق، وبيانات التشخيص.',
      'Push notification information: tokens and preferences used to deliver notifications.': 'معلومات الإشعارات الفورية: الرموز والتفضيلات المستخدمة لإرسال الإشعارات.',
      'Create and manage user and business accounts.': 'إنشاء وإدارة حسابات المستخدمين والأنشطة التجارية.',
      'Connect customers with local businesses.': 'ربط العملاء بالأنشطة المحلية.',
      'Provide messaging, booking, and related services.': 'تقديم خدمات الرسائل والحجوزات والخدمات المرتبطة بها.',
      'Improve app functionality, reliability, and user experience.': 'تحسين وظائف التطبيق وموثوقيته وتجربة المستخدم.',
      'Send notifications relevant to your activity and preferences.': 'إرسال إشعارات مرتبطة بنشاطك وتفضيلاتك.',
      'Maintain the security and integrity of the platform.': 'الحفاظ على أمن المنصة وسلامتها.',
      'Provide customer support and respond to inquiries.': 'تقديم دعم العملاء والرد على الاستفسارات.',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'بإذن منك، نستخدم موقع جهازك لمساعدتك على اكتشاف الأنشطة القريبة وتحسين نتائج البحث المحلي.',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'يمكنك تفعيل أو تعطيل الوصول إلى الموقع في أي وقت من إعدادات جهازك. وقد يؤدي تعطيل الوصول إلى الموقع إلى تقييد بعض ميزات التطبيق.',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'يمكن للمستخدمين والأنشطة إرسال محتوى إلى GoOn، بما في ذلك المراجعات والصور وتفاصيل الملف الشخصي والرسائل.',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'أنت مسؤول عن المحتوى الذي ترسله وعن التأكد من التزامه بالقوانين المعمول بها وسياساتنا. وقد تقوم GoOn بإزالة أي محتوى ينتهك سياساتنا أو القانون.',
      'GoOn does not sell your personal information.': 'لا تبيع GoOn معلوماتك الشخصية.',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'قد نشارك المعلومات مع مزودي خدمات موثوقين يساعدوننا في تشغيل التطبيق، مثل الاستضافة والمصادقة وقواعد البيانات وخدمات الإشعارات. ويُسمح لهؤلاء المزودين باستخدام معلوماتك فقط بالقدر اللازم لتقديم خدماتهم لنا.',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'قد نفصح أيضًا عن المعلومات عندما يقتضي القانون أو الإجراءات القانونية ذلك، أو لحماية حقوق وسلامة وممتلكات GoOn أو مستخدمينا أو الآخرين.',
      'GoOn may use third-party services to support the app. These services may include:': 'قد تستخدم GoOn خدمات طرف ثالث لدعم التطبيق. وقد تشمل هذه الخدمات:',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'نستخدم تدابير تقنية وتنظيمية معقولة للمساعدة في حماية معلوماتك من الوصول غير المصرح به أو الكشف أو التعديل أو الإتلاف.',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'ومع ذلك، لا توجد وسيلة نقل عبر الإنترنت أو تخزين إلكتروني آمنة بنسبة 100%، ولا يمكننا ضمان الأمان المطلق.',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'يمكنك طلب حذف حسابك والبيانات الشخصية المرتبطة به في أي وقت عبر التواصل معنا.',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'قد يتم الاحتفاظ ببعض المعلومات بعد حذف الحساب عند الحاجة للامتثال للالتزامات القانونية أو حل النزاعات أو منع الاحتيال أو تنفيذ اتفاقياتنا.',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'GoOn غير مخصص للأطفال دون سن 13 عامًا. ونحن لا نجمع عن قصد معلومات شخصية من الأطفال دون 13 عامًا.',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'إذا كنت تعتقد أن طفلًا زوّدنا بمعلومات شخصية، يُرجى التواصل معنا حتى نتخذ الإجراءات المناسبة لإزالتها.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. وعند إجراء تغييرات جوهرية، سنقوم بإبلاغك عبر التطبيق أو موقعنا. واستمرارك في استخدام GoOn بعد أي تحديث يعني قبولك للسياسة المعدلة.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'عند الوصول إلى GoOn أو استخدامه، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا لم توافق، يرجى عدم استخدام التطبيق.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn منصة محلية لاكتشاف الأعمال والمراسلة والحجوزات للعملاء والأنشطة التجارية.',
      'You must provide accurate and current information.': 'يجب عليك تقديم معلومات دقيقة ومحدثة.',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'أنت مسؤول عن الحفاظ على سرية بيانات اعتماد حسابك.',
      'You are responsible for activities under your account.': 'أنت مسؤول عن الأنشطة التي تتم عبر حسابك.',
      'Do not misuse, disrupt, or reverse engineer the service.': 'يُمنع إساءة استخدام الخدمة أو تعطيلها أو إجراء هندسة عكسية لها.',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'يُمنع إرسال محتوى غير قانوني أو مسيء أو احتيالي أو منتهك للحقوق.',
      'Do not attempt unauthorized access to systems or data.': 'يُمنع محاولة الوصول غير المصرح به إلى الأنظمة أو البيانات.',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'تحتفظ الأنشطة والمستخدمون بملكية محتواهم. وبإرسال المحتوى إلى GoOn، فإنك تمنحنا ترخيصًا محدودًا لاستضافته وعرضه ومعالجته فقط لتشغيل الخدمة.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'تسهل GoOn الحجوزات والتواصل بين العملاء والأنشطة. ولا تُعد GoOn طرفًا في تنفيذ الخدمات التي تقدمها الأنشطة المستقلة.',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'يجوز لنا تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط أو القوانين المعمول بها أو متطلبات سلامة المنصة.',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'تُقدَّم الخدمة على أساس "كما هي" و"حسب التوفر" دون أي ضمانات من أي نوع، وذلك بالقدر الذي يسمح به القانون.',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'إلى أقصى حد يسمح به القانون، لا تتحمل GoOn المسؤولية عن الأضرار غير المباشرة أو العرضية أو الخاصة أو التبعية أو العقابية الناتجة عن استخدامك للخدمة.',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'قد نقوم بتحديث هذه الشروط من وقت لآخر. ويُعد استمرارك في استخدام GoOn بعد التحديثات قبولًا للشروط المعدلة.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'ملفات تعريف الارتباط والتقنيات المشابهة هي معرّفات صغيرة تُستخدم لتحسين الموثوقية والأمان وسهولة الاستخدام عبر منظومة تطبيقنا.',
      'Authentication and session continuity.': 'المصادقة واستمرارية الجلسة.',
      'Security monitoring and fraud prevention.': 'مراقبة الأمان ومنع الاحتيال.',
      'App performance and reliability diagnostics.': 'تشخيص أداء التطبيق وموثوقيته.',
      'Notification and preference management.': 'إدارة الإشعارات والتفضيلات.',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'على الأجهزة المحمولة، قد تشمل هذه التقنيات رموز التخزين المحلي ومعرّفات على مستوى الجهاز تُستخدم لتسجيل دخول آمن وإشعارات فورية.',
      'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': 'يمكنك إدارة الأذونات من إعدادات جهازك. وقد يؤدي تعطيل بعض الأذونات إلى تقليل أو تعطيل بعض الميزات مثل الإشعارات أو الاكتشاف حسب الموقع أو الجلسات المستمرة.',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'قد نقوم بتحديث سياسة ملفات تعريف الارتباط هذه لتعكس التغييرات في التكنولوجيا أو المتطلبات القانونية أو ميزات المنتج.',
      'Firebase services': 'خدمات Firebase',
      'Cloud hosting providers': 'مزودو الاستضافة السحابية',
      'Database services': 'خدمات قواعد البيانات',
      'Push notification services': 'خدمات الإشعارات الفورية',
      'Analytics and crash reporting, if enabled': 'التحليلات وتقارير الأعطال، إذا كانت مفعلة',
      'Access the personal information we hold about you.': 'الوصول إلى المعلومات الشخصية التي نحتفظ بها عنك.',
      'Update or correct your information.': 'تحديث معلوماتك أو تصحيحها.',
      'Request deletion of your account or personal data.': 'طلب حذف حسابك أو بياناتك الشخصية.',
      'Contact GoOn regarding privacy questions or concerns.': 'التواصل مع GoOn بشأن أسئلة أو مخاوف الخصوصية.',
      'For legal inquiries: idealcrea@gmail.com': 'للاستفسارات القانونية: idealcrea@gmail.com',
      'For cookie-related questions: idealcrea@gmail.com': 'لاستفسارات ملفات تعريف الارتباط: idealcrea@gmail.com',
      '1. Acceptance of Terms': '1. قبول الشروط',
      '2. Description of Service': '2. وصف الخدمة',
      '3. Account Responsibilities': '3. مسؤوليات الحساب',
      '4. Acceptable Use': '4. الاستخدام المقبول',
      '5. Business Content and User Content': '5. محتوى الأنشطة ومحتوى المستخدم',
      '6. Bookings and Communications': '6. الحجوزات والتواصل',
      '7. Suspension and Termination': '7. التعليق والإنهاء',
      '8. Disclaimer of Warranties': '8. إخلاء المسؤولية عن الضمانات',
      '9. Limitation of Liability': '9. تحديد المسؤولية',
      '10. Changes to Terms': '10. التعديلات على الشروط',
      '11. Contact': '11. التواصل',
      '1. What Are Cookies and Similar Technologies': '1. ما هي ملفات تعريف الارتباط والتقنيات المشابهة',
      '2. How GoOn Uses Them': '2. كيف تستخدم GoOn هذه التقنيات',
      '3. Mobile Environment': '3. بيئة الهاتف المحمول',
      '4. Your Choices': '4. خياراتك',
      '5. Updates': '5. التحديثات',
      '6. Contact': '6. التواصل',
      '© 2026 GoOn. All rights reserved.': '© 2026 GoOn. جميع الحقوق محفوظة.',
    },
  };

  const translateLegalDoc = (doc, lang) => {
    const dict = LEGAL_TRANSLATIONS[lang];
    if (!dict) return doc;

    const tr = (value) => {
      if (typeof value !== 'string') return value;
      return dict[value] || value;
    };

    return {
      ...doc,
      title: tr(doc.title),
      lastUpdated: tr(doc.lastUpdated),
      sections: (doc.sections || []).map((section) => ({
        ...section,
        heading: tr(section.heading),
        paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs.map(tr) : section.paragraphs,
        bullets: Array.isArray(section.bullets) ? section.bullets.map(tr) : section.bullets,
      })),
    };
  };
  const recoverySteps = [
    t('recoveryStep1'),
    t('recoveryStep2'),
    t('recoveryStep3'),
  ];
  const recoveryOptions = [
    {
      key: 'email',
      title: t('recoveryOptionEmailTitle'),
      detail: t('recoveryOptionEmailDetail'),
      icon: '✉️',
    },
    {
      key: 'spam',
      title: t('recoveryOptionSpamTitle'),
      detail: t('recoveryOptionSpamDetail'),
      icon: '🛡️',
    },
    {
      key: 'mailapp',
      title: t('recoveryOptionMailTitle'),
      detail: t('recoveryOptionMailDetail'),
      icon: '📬',
    },
  ];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [authError, setAuthError] = useState('');
  const [legalVisible, setLegalVisible] = useState(false);
  const [legalType, setLegalType] = useState('terms');

  const resolveAuthErrorMessage = (res) => {
    const deletedMessage = t(
      'authAccountDeleted',
      'This account has been permanently deleted. You cannot sign in or create a new account with this email anymore.'
    );

    if (String(res?.errorCode || '').toUpperCase() === 'ACCOUNT_DELETED') {
      return deletedMessage;
    }

    const rawError = String(res?.error || '');
    if (/account has been deleted|cannot sign in anymore|cannot be used anymore/i.test(rawError)) {
      return deletedMessage;
    }

    return rawError || t('loginFailed', 'Unable to sign in. Please check your credentials and try again.');
  };

  const legalDocs = {
    privacy: {
      title: isFrench ? 'Politique de confidentialite' : 'Privacy Policy',
      lastUpdated: isFrench ? 'Derniere mise a jour : 22 juillet 2026' : 'Last updated: July 22, 2026',
      sections: [
        {
          heading: isFrench ? 'Sommaire' : 'Contents',
          bullets: [
            isFrench ? '1. Introduction' : '1. Introduction',
            isFrench ? '2. Informations que nous collectons' : '2. Information We Collect',
            isFrench ? '3. Utilisation des informations' : '3. How We Use Information',
            isFrench ? '4. Informations de localisation' : '4. Location Information',
            isFrench ? '5. Contenu genere par les utilisateurs' : '5. User Generated Content',
            isFrench ? '6. Partage des donnees' : '6. Data Sharing',
            isFrench ? '7. Services tiers' : '7. Third-Party Services',
            isFrench ? '8. Securite des donnees' : '8. Data Security',
            isFrench ? '9. Conservation des donnees et suppression du compte' : '9. Data Retention and Account Deletion',
            isFrench ? '10. Vie privee des enfants' : '10. Children\'s Privacy',
            isFrench ? '11. Vos droits en matiere de vie privee' : '11. Your Privacy Rights',
            isFrench ? '12. Modifications de cette politique de confidentialite' : '12. Changes to This Privacy Policy',
            isFrench ? '13. Contact' : '13. Contact Information',
          ],
        },
        {
          heading: isFrench ? '1. Introduction' : '1. Introduction',
          paragraphs: [
            isFrench
              ? 'GoOn est une plateforme locale de decouverte d\'entreprises et de reservation qui connecte les clients aux entreprises de proximite. Via l\'application mobile GoOn, les clients peuvent decouvrir des entreprises, consulter des profils, echanger des messages, reserver des rendez-vous, laisser des avis et recevoir des notifications. Les entreprises peuvent gerer leurs profils, communiquer avec les clients, organiser leurs rendez-vous et promouvoir leurs services.'
              : 'GoOn is a local business discovery and booking platform that connects customers with local businesses. Through the GoOn mobile application, customers can discover businesses, view profiles, exchange messages, book appointments, leave reviews, and receive notifications. Businesses can manage their profiles, communicate with customers, manage appointments, and promote their services.',
            isFrench
              ? 'Votre vie privee est importante pour nous. Cette politique de confidentialite explique quelles informations nous collectons, comment nous les utilisons et quels choix vous avez. En utilisant GoOn, vous acceptez les pratiques decrites dans cette politique.'
              : 'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.',
          ],
        },
        {
          heading: isFrench ? '2. Informations que nous collectons' : '2. Information We Collect',
          paragraphs: [isFrench ? 'Nous collectons les categories d\'informations suivantes :' : 'We collect the following categories of information:'],
          bullets: [
            isFrench ? 'Informations de compte : nom, email et numero de telephone (si fourni).' : 'Account information: such as your name, email address, and phone number (if provided).',
            isFrench ? 'Informations de profil : details ajoutes a votre profil client ou entreprise.' : 'Profile information: details you add to your customer or business profile.',
            isFrench ? 'Informations entreprise : services, horaires et coordonnees fournis par les comptes entreprise.' : 'Business information: information provided by business accounts, including services, hours, and contact details.',
            isFrench ? 'Donnees de localisation : collectees uniquement si vous autorisez l\'acces a la localisation.' : 'Location data: collected only when you allow location access through your device.',
            isFrench ? 'Messages et communications : messages echanges entre clients et entreprises via l\'application.' : 'Messages and communications: messages exchanged between customers and businesses through the app.',
            isFrench ? 'Informations de rendez-vous et reservation : details des rendez-vous reserves ou recus.' : 'Appointment and booking information: details related to appointments you book or receive.',
            isFrench ? 'Avis et notes : contenu que vous publiez sur les entreprises.' : 'Reviews and ratings: content you submit about businesses.',
            isFrench ? 'Photos : images televersees par les utilisateurs ou les entreprises.' : 'Photos: images uploaded by users or businesses.',
            isFrench ? 'Informations techniques de l\'appareil : modele, systeme, version de l\'app et diagnostic.' : 'Device information and technical data: such as device model, operating system, app version, and diagnostic information.',
            isFrench ? 'Informations de notification push : tokens et preferences utilises pour livrer les notifications.' : 'Push notification information: tokens and preferences used to deliver notifications.',
          ],
        },
        {
          heading: isFrench ? '3. Utilisation des informations' : '3. How We Use Information',
          paragraphs: [isFrench ? 'Nous utilisons ces informations pour :' : 'We use the information we collect to:'],
          bullets: [
            isFrench ? 'Creer et gerer les comptes utilisateurs et entreprises.' : 'Create and manage user and business accounts.',
            isFrench ? 'Connecter les clients aux entreprises locales.' : 'Connect customers with local businesses.',
            isFrench ? 'Fournir la messagerie, la reservation et les services associes.' : 'Provide messaging, booking, and related services.',
            isFrench ? 'Ameliorer la fiabilite, les fonctionnalites et l\'experience utilisateur.' : 'Improve app functionality, reliability, and user experience.',
            isFrench ? 'Envoyer des notifications pertinentes selon votre activite et vos preferences.' : 'Send notifications relevant to your activity and preferences.',
            isFrench ? 'Maintenir la securite et l\'integrite de la plateforme.' : 'Maintain the security and integrity of the platform.',
            isFrench ? 'Fournir une assistance client et repondre a vos demandes.' : 'Provide customer support and respond to inquiries.',
          ],
        },
        {
          heading: isFrench ? '4. Informations de localisation' : '4. Location Information',
          paragraphs: [
            isFrench
              ? 'Avec votre permission, nous utilisons la localisation de votre appareil pour vous aider a decouvrir des entreprises proches et ameliorer les resultats de recherche locale.'
              : 'With your permission, we use your device location to help you discover nearby businesses and improve local search results.',
            isFrench
              ? 'Vous pouvez activer ou desactiver cet acces a tout moment depuis les reglages de votre appareil. La desactivation peut limiter certaines fonctionnalites de l\'application.'
              : 'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.',
          ],
        },
        {
          heading: isFrench ? '5. Contenu genere par les utilisateurs' : '5. User Generated Content',
          paragraphs: [
            isFrench
              ? 'Les utilisateurs et les entreprises peuvent publier du contenu sur GoOn, y compris des avis, photos, details de profil et messages.'
              : 'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.',
            isFrench
              ? 'Vous etes responsable du contenu que vous publiez et de sa conformite aux lois applicables et a nos politiques. GoOn peut retirer tout contenu contraire a ces regles.'
              : 'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.',
          ],
        },
        {
          heading: isFrench ? '6. Partage des donnees' : '6. Data Sharing',
          paragraphs: [
            isFrench ? 'GoOn ne vend pas vos informations personnelles.' : 'GoOn does not sell your personal information.',
            isFrench
              ? 'Nous pouvons partager certaines informations avec des prestataires de confiance qui nous aident a exploiter l\'application, notamment pour l\'hebergement, l\'authentification, la base de donnees et les notifications. Ces prestataires ne peuvent utiliser vos informations que pour fournir ces services.'
              : 'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.',
            isFrench
              ? 'Nous pouvons egalement divulguer des informations lorsque la loi l\'exige, dans le cadre d\'une procedure legale, ou pour proteger les droits, la securite et les biens de GoOn, de nos utilisateurs ou de tiers.'
              : 'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.',
          ],
        },
        {
          heading: isFrench ? '7. Services tiers' : '7. Third-Party Services',
          paragraphs: [
            isFrench
              ? 'GoOn peut utiliser des services tiers pour faire fonctionner l\'application. Ces services peuvent inclure :'
              : 'GoOn may use third-party services to support the app. These services may include:',
          ],
          bullets: [
            isFrench ? 'Services Firebase' : 'Firebase services',
            isFrench ? 'Fournisseurs cloud d\'hebergement' : 'Cloud hosting providers',
            isFrench ? 'Services de base de donnees' : 'Database services',
            isFrench ? 'Services de notifications push' : 'Push notification services',
            isFrench ? 'Analytics et rapports de crash, si actives' : 'Analytics and crash reporting, if enabled',
          ],
        },
        {
          heading: isFrench ? '8. Securite des donnees' : '8. Data Security',
          paragraphs: [
            isFrench
              ? 'Nous mettons en oeuvre des mesures techniques et organisationnelles raisonnables pour proteger vos informations contre tout acces, divulgation, alteration ou destruction non autorise.'
              : 'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.',
            isFrench
              ? 'Toutefois, aucune methode de transmission sur internet ou de stockage electronique n\'est totalement securisee, et nous ne pouvons pas garantir une securite absolue.'
              : 'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.',
          ],
        },
        {
          heading: isFrench ? '9. Conservation des donnees et suppression du compte' : '9. Data Retention and Account Deletion',
          paragraphs: [
            isFrench
              ? 'Vous pouvez demander la suppression de votre compte et des donnees personnelles associees a tout moment en nous contactant.'
              : 'You may request deletion of your account and associated personal data at any time by contacting us.',
            isFrench
              ? 'Certaines informations peuvent etre conservees apres suppression lorsque cela est necessaire pour respecter des obligations legales, resoudre des litiges, prevenir la fraude ou faire appliquer nos accords.'
              : 'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.',
          ],
        },
        {
          heading: isFrench ? '10. Vie privee des enfants' : '10. Children\'s Privacy',
          paragraphs: [
            isFrench
              ? 'GoOn n\'est pas concu pour les enfants de moins de 13 ans et ne leur est pas destine. Nous ne collectons pas sciemment de donnees personnelles concernant des enfants de moins de 13 ans.'
              : 'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.',
            isFrench
              ? 'Si vous pensez qu\'un enfant nous a fourni des informations personnelles, contactez-nous afin que nous puissions prendre les mesures appropriees pour les supprimer.'
              : 'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.',
          ],
        },
        {
          heading: isFrench ? '11. Vos droits en matiere de vie privee' : '11. Your Privacy Rights',
          paragraphs: [isFrench ? 'Selon votre lieu de residence, vous pouvez avoir le droit de :' : 'Depending on your location, you may have the right to:'],
          bullets: [
            isFrench ? 'Acceder aux informations personnelles que nous detenons sur vous.' : 'Access the personal information we hold about you.',
            isFrench ? 'Mettre a jour ou corriger vos informations.' : 'Update or correct your information.',
            isFrench ? 'Demander la suppression de votre compte ou de vos donnees personnelles.' : 'Request deletion of your account or personal data.',
            isFrench ? 'Contacter GoOn pour toute question ou preoccupation relative a la vie privee.' : 'Contact GoOn regarding privacy questions or concerns.',
          ],
        },
        {
          heading: isFrench ? '12. Modifications de cette politique de confidentialite' : '12. Changes to This Privacy Policy',
          paragraphs: [
            isFrench
              ? 'Nous pouvons mettre a jour cette politique de confidentialite de temps en temps. En cas de modification importante, nous vous informerons via l\'application ou notre site web. Votre utilisation continue de GoOn apres une mise a jour signifie que vous acceptez la version revisee.'
              : 'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.',
          ],
        },
        {
          heading: isFrench ? '13. Contact' : '13. Contact Information',
          paragraphs: [
            'GoOn Support',
            'Email: idealcrea@gmail.com',
            '© 2026 GoOn. All rights reserved.',
          ],
        },
      ],
    },
    terms: {
      title: isFrench ? 'Conditions d\'utilisation' : 'Terms of Service',
      lastUpdated: isFrench ? 'Derniere mise a jour : 05 aout 2026' : 'Last updated: August 05, 2026',
      sections: [
        {
          heading: isFrench ? '1. Acceptation des conditions' : '1. Acceptance of Terms',
          paragraphs: [
            isFrench
              ? 'En accedant a GoOn ou en l\'utilisant, vous acceptez d\'etre lie par ces conditions d\'utilisation. Si vous n\'etes pas d\'accord, veuillez ne pas utiliser l\'application.'
              : 'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.',
          ],
        },
        {
          heading: isFrench ? '2. Description du service' : '2. Description of Service',
          paragraphs: [
            isFrench
              ? 'GoOn est une plateforme locale de decouverte d\'entreprises, de messagerie et de reservation pour les clients et les entreprises.'
              : 'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.',
          ],
        },
        {
          heading: isFrench ? '3. Responsabilites du compte' : '3. Account Responsibilities',
          bullets: [
            isFrench ? 'Vous devez fournir des informations exactes et a jour.' : 'You must provide accurate and current information.',
            isFrench ? 'Vous etes responsable de la confidentialite de vos identifiants.' : 'You are responsible for maintaining the confidentiality of your account credentials.',
            isFrench ? 'Vous etes responsable des activites effectuees avec votre compte.' : 'You are responsible for activities under your account.',
          ],
        },
        {
          heading: isFrench ? '4. Utilisation acceptable' : '4. Acceptable Use',
          bullets: [
            isFrench ? 'Ne pas detourner, perturber ou retro-concevoir le service.' : 'Do not misuse, disrupt, or reverse engineer the service.',
            isFrench ? 'Ne pas soumettre de contenu illicite, abusif, frauduleux ou contrefaisant.' : 'Do not submit unlawful, abusive, fraudulent, or infringing content.',
            isFrench ? 'Ne pas tenter un acces non autorise aux systemes ou donnees.' : 'Do not attempt unauthorized access to systems or data.',
          ],
        },
        {
          heading: isFrench ? '5. Contenu des entreprises et des utilisateurs' : '5. Business Content and User Content',
          paragraphs: [
            isFrench
              ? 'Les entreprises et utilisateurs conservent la propriete de leur contenu. En publiant du contenu sur GoOn, vous nous accordez une licence limitee pour l\'heberger, l\'afficher et le traiter uniquement afin d\'exploiter le service.'
              : 'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.',
          ],
        },
        {
          heading: isFrench ? '6. Reservations et communications' : '6. Bookings and Communications',
          paragraphs: [
            isFrench
              ? 'GoOn facilite les reservations et les communications entre clients et entreprises. GoOn n\'est pas partie a l\'execution des prestations fournies par des entreprises independantes.'
              : 'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.',
          ],
        },
        {
          heading: isFrench ? '7. Suspension et resiliation' : '7. Suspension and Termination',
          paragraphs: [
            isFrench
              ? 'Nous pouvons suspendre ou supprimer les comptes qui violent ces conditions, la loi applicable ou les exigences de securite de la plateforme.'
              : 'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.',
          ],
        },
        {
          heading: isFrench ? '8. Exclusion de garantie' : '8. Disclaimer of Warranties',
          paragraphs: [
            isFrench
              ? 'Le service est fourni "en l\'etat" et "selon disponibilite", sans garantie d\'aucune sorte, dans les limites autorisees par la loi.'
              : 'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.',
          ],
        },
        {
          heading: isFrench ? '9. Limitation de responsabilite' : '9. Limitation of Liability',
          paragraphs: [
            isFrench
              ? 'Dans la mesure maximale permise par la loi, GoOn ne pourra etre tenu responsable des dommages indirects, accessoires, speciaux, consecutifs ou punitifs lies a votre utilisation du service.'
              : 'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.',
          ],
        },
        {
          heading: isFrench ? '10. Modifications des conditions' : '10. Changes to Terms',
          paragraphs: [
            isFrench
              ? 'Nous pouvons modifier ces conditions de temps a autre. La poursuite de l\'utilisation de GoOn apres mise a jour vaut acceptation des conditions revisees.'
              : 'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.',
          ],
        },
        {
          heading: isFrench ? '11. Contact' : '11. Contact',
          paragraphs: [
            isFrench ? 'Pour les demandes juridiques : idealcrea@gmail.com' : 'For legal inquiries: idealcrea@gmail.com',
          ],
        },
      ],
    },
    cookies: {
      title: isFrench ? 'Politique de cookies' : 'Cookie Policy',
      lastUpdated: isFrench ? 'Derniere mise a jour : 05 aout 2026' : 'Last updated: August 05, 2026',
      sections: [
        {
          heading: isFrench ? '1. Que sont les cookies et technologies similaires' : '1. What Are Cookies and Similar Technologies',
          paragraphs: [
            isFrench
              ? 'Les cookies et technologies similaires sont de petits identifiants utilises pour ameliorer la fiabilite, la securite et l\'utilisabilite de notre ecosysteme applicatif.'
              : 'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.',
          ],
        },
        {
          heading: isFrench ? '2. Comment GoOn les utilise' : '2. How GoOn Uses Them',
          bullets: [
            isFrench ? 'Authentification et continuite de session.' : 'Authentication and session continuity.',
            isFrench ? 'Surveillance de securite et prevention de la fraude.' : 'Security monitoring and fraud prevention.',
            isFrench ? 'Performance applicative et diagnostic de fiabilite.' : 'App performance and reliability diagnostics.',
            isFrench ? 'Gestion des notifications et des preferences.' : 'Notification and preference management.',
          ],
        },
        {
          heading: isFrench ? '3. Environnement mobile' : '3. Mobile Environment',
          paragraphs: [
            isFrench
              ? 'Sur mobile, ces technologies peuvent inclure des tokens de stockage local et des identifiants appareil utilises pour une connexion securisee et les notifications push.'
              : 'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.',
          ],
        },
        {
          heading: isFrench ? '4. Vos choix' : '4. Your Choices',
          paragraphs: [
            isFrench
              ? 'Vous pouvez gerer les permissions depuis les reglages de votre appareil. La desactivation de certaines permissions peut reduire ou desactiver des fonctionnalites comme les notifications, la decouverte locale ou la persistance de session.'
              : 'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.',
          ],
        },
        {
          heading: isFrench ? '5. Mises a jour' : '5. Updates',
          paragraphs: [
            isFrench
              ? 'Nous pouvons mettre a jour cette politique de cookies pour refleter les evolutions technologiques, legales ou produit.'
              : 'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.',
          ],
        },
        {
          heading: isFrench ? '6. Contact' : '6. Contact',
          paragraphs: [
            isFrench ? 'Pour toute question sur les cookies : idealcrea@gmail.com' : 'For cookie-related questions: idealcrea@gmail.com',
          ],
        },
      ],
    },
  };
  const selectedLegalDocRaw = legalDocs[legalType] || legalDocs.terms;
  const selectedLegalDoc = legalLang ? translateLegalDoc(selectedLegalDocRaw, legalLang) : selectedLegalDocRaw;

  const handleLogin = async () => {
    setAuthError('');
    const res = await login(email, password);

    if (!res.success) {
      const message = resolveAuthErrorMessage(res);
      setAuthError(message);
      console.log(message);
    }
  };

  const openRecovery = () => {
    setRecoveryEmail(email.trim());
    setRecoveryError('');
    setRecoveryMessage('');
    setRecoveryVisible(true);
  };

  const openLegal = (type) => {
    setLegalType(type);
    setLegalVisible(true);
  };

  const closeLegal = () => {
    setLegalVisible(false);
  };

  const closeRecovery = () => {
    if (recoveryLoading) return;
    setRecoveryVisible(false);
    setRecoveryError('');
    setRecoveryMessage('');
  };

  const handleSendRecovery = async () => {
    const targetEmail = recoveryEmail.trim();

    if (!emailRegex.test(targetEmail)) {
      setRecoveryError(t('recoveryEmailInvalid'));
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoveryMessage('');

    try {
      await resetPassword(targetEmail);
      setRecoveryMessage(t('recoveryEmailSent'));
    } catch (error) {
      const message = error?.message || t('recoveryUnableSend');
      setRecoveryError(message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const openMailApp = async () => {
    try {
      const canOpen = await Linking.canOpenURL('mailto:');
      if (canOpen) {
        await Linking.openURL('mailto:');
      }
    } catch (_) {
      Alert.alert(t('recoveryOpenMail'), t('recoveryUnableSend'));
    }
  };

  const isDisabled = !email || !password || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        {/* TITLE */}
        <Text style={styles.title}>{t('loginTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('loginSubtitle')}
        </Text>

        {/* EMAIL */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>{t('email')}</Text>
          <TextInput
            placeholder={t('email')}
            placeholderTextColor="#8E8E93"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (authError) setAuthError('');
            }}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        {/* PASSWORD */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>{t('password')}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (authError) setAuthError('');
              }}
              secureTextEntry={secure}
              style={styles.inputFlex}
            />
            <TouchableOpacity onPress={() => setSecure(!secure)}>
              <Text style={styles.show}>
                {secure ? t('show') : t('hide')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BUTTON */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={isDisabled}
          style={[
            styles.button,
            isDisabled && styles.buttonDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('signIn')}</Text>
          )}
        </TouchableOpacity>

        {!!authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        {/* Continue as Guest */}
        <TouchableOpacity
          onPress={() => {
            continueAsGuest();
            navigation.replace('Home');
          }}
          style={styles.guestButton}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={18} color="#8F2AC3" />
          <Text style={styles.guestButtonText}>{GUEST_LABELS[language] || GUEST_LABELS.en}</Text>
        </TouchableOpacity>

        {/* FOOTER OPTIONS */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={openRecovery} activeOpacity={0.82}>
            <Text style={styles.footerText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerTextStrong}>{t('createAccount')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legalWrap}>
          <Text style={styles.legalText}>
            {t('loginLegalPrefix', 'By continuing, you agree to our')}{' '}
            <Text style={styles.legalLink} onPress={() => openLegal('terms')}>
              {t('loginLegalTerms', 'Terms of Service')}
            </Text>
            ,{' '}
            <Text style={styles.legalLink} onPress={() => openLegal('privacy')}>
              {t('loginLegalPrivacy', 'Privacy Policy')}
            </Text>{' '}
            {t('loginLegalAnd', 'and')}{' '}
            <Text style={styles.legalLink} onPress={() => openLegal('cookies')}>
              {t('loginLegalCookies', 'Cookie Policy')}
            </Text>
            .
          </Text>
        </View>
      </View>

      <Modal
        visible={recoveryVisible}
        animationType="fade"
        transparent
        onRequestClose={closeRecovery}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdropTouchable} onPress={closeRecovery} />
          <Pressable style={styles.recoverySheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                  <Text style={styles.sheetTitle}>{t('recoveryTitle')}</Text>
                  <Text style={styles.sheetSubtitle}>{t('recoverySubtitle')}</Text>
              </View>
              <TouchableOpacity onPress={closeRecovery} disabled={recoveryLoading} activeOpacity={0.8}>
                  <Text style={styles.closeBtn}>{t('close')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              nestedScrollEnabled
              alwaysBounceVertical
            >
              <View style={styles.stepCard}>
                  <Text style={styles.sectionLabel}>{t('recoveryHowItWorks')}</Text>
                  {recoverySteps.map((step, index) => (
                  <View key={step} style={styles.stepRow}>
                    <View style={styles.stepIndex}>
                      <Text style={styles.stepIndexText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.formCard}>
                <Text style={styles.sectionLabel}>{t('recoverySendLink')}</Text>
                <Text style={styles.formHint}>{t('recoverySubtitle')}</Text>

                <TextInput
                  placeholder={t('email')}
                  placeholderTextColor="#7C7C93"
                  value={recoveryEmail}
                  onChangeText={setRecoveryEmail}
                  style={styles.recoveryInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />

                {!!recoveryError ? <Text style={styles.errorText}>{recoveryError}</Text> : null}
                {!!recoveryMessage ? <Text style={styles.successText}>{recoveryMessage}</Text> : null}

                <TouchableOpacity
                  onPress={handleSendRecovery}
                  disabled={recoveryLoading}
                  style={[styles.recoveryButton, recoveryLoading && styles.recoveryButtonDisabled]}
                  activeOpacity={0.86}
                >
                  {recoveryLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.recoveryButtonText}>{t('recoverySendLink')}</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.optionsCard}>
                <Text style={styles.sectionLabel}>{t('recoveryUsefulOptions')}</Text>
                {recoveryOptions.map((option) => (
                  <View key={option.key} style={styles.optionRow}>
                    <View style={styles.optionIconWrap}>
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionDetail}>{option.detail}</Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity onPress={openMailApp} style={styles.secondaryButton} activeOpacity={0.85}>
                  <Text style={styles.secondaryButtonText}>{t('recoveryOpenMail')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sheetNote}>
                <Text style={styles.sheetNoteTitle}>{t('recoverySecurityTip')}</Text>
                <Text style={styles.sheetNoteText}>{t('recoverySecurityText')}</Text>
              </View>
            </ScrollView>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={legalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeLegal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdropTouchable} onPress={closeLegal} />
          <View style={styles.legalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.legalBrandWrap}>
              <View style={styles.legalBrandBadge}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.legalBrandLogo}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.legalBrandText}>GoOn</Text>
            </View>
            <View style={styles.legalHeader}>
              <Text style={styles.legalTitle}>{selectedLegalDoc.title}</Text>
              <TouchableOpacity onPress={closeLegal} activeOpacity={0.8}>
                <Text style={styles.closeBtn}>{t('close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legalMeta}>{selectedLegalDoc.lastUpdated}</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.legalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {selectedLegalDoc.sections.map((section) => (
                <View key={section.heading} style={styles.legalSectionCard}>
                  <Text style={styles.legalSectionTitle}>{section.heading}</Text>

                  {Array.isArray(section.paragraphs)
                    ? section.paragraphs.map((paragraph, index) => (
                        <Text key={`${section.heading}-p-${index}`} style={styles.legalBody}>
                          {paragraph}
                        </Text>
                      ))
                    : null}

                  {Array.isArray(section.bullets)
                    ? section.bullets.map((bullet, index) => (
                        <View key={`${section.heading}-b-${index}`} style={styles.legalBulletRow}>
                          <Text style={styles.legalBulletDot}>•</Text>
                          <Text style={styles.legalBulletText}>{bullet}</Text>
                        </View>
                      ))
                    : null}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0E6F8',
    justifyContent: 'center',
    padding: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    shadowColor: '#7421A8',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#251A34',
    marginBottom: 6,
    letterSpacing: -0.5,
  },

  subtitle: {
    color: '#8B7A9F',
    marginBottom: 24,
    fontSize: 14,
    fontWeight: '500',
  },

  inputBox: {
    marginBottom: 16,
  },

  label: {
    color: '#7421A8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  input: {
    backgroundColor: '#F9F5FE',
    borderRadius: 14,
    padding: 14,
    color: '#251A34',
    borderWidth: 1,
    borderColor: '#D9D2E8',
    fontSize: 15,
  },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F5FE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    paddingRight: 12,
  },

  inputFlex: {
    flex: 1,
    padding: 14,
    color: '#251A34',
    fontSize: 15,
  },

  show: {
    color: '#8F2AC3',
    fontWeight: '700',
    fontSize: 13,
  },

  button: {
    backgroundColor: '#8F2AC3',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#7421A8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  footerText: {
    color: '#8B7A9F',
    fontSize: 13,
    fontWeight: '500',
  },

  footerTextStrong: {
    color: '#8F2AC3',
    fontWeight: '800',
    fontSize: 13,
  },

  legalWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECE4F5',
  },

  legalText: {
    color: '#7F6C97',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },

  legalLink: {
    color: '#6D1DA0',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(37, 26, 52, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  recoverySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#D9D2E8',
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D9D2E8',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#251A34',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: '#8B7A9F',
    lineHeight: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  closeBtn: {
    color: '#8F2AC3',
    fontWeight: '700',
    fontSize: 14,
    paddingTop: 4,
  },
  sheetScroll: {
    paddingBottom: 8,
    gap: 14,
  },
  stepCard: {
    backgroundColor: '#F9F5FE',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    padding: 16,
  },
  sectionLabel: {
    color: '#7421A8',
    fontWeight: '900',
    fontSize: 11,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8F2AC3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    color: '#251A34',
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#F9F5FE',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    padding: 16,
  },
  formHint: {
    color: '#8B7A9F',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: '500',
  },
  recoveryInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#251A34',
    borderWidth: 1,
    borderColor: '#D9D2E8',
    fontSize: 15,
  },
  errorText: {
    color: '#C0392B',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  successText: {
    color: '#27AE60',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  recoveryButton: {
    marginTop: 14,
    backgroundColor: '#8F2AC3',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#7421A8',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  recoveryButtonDisabled: {
    opacity: 0.6,
  },
  recoveryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  optionsCard: {
    backgroundColor: '#F9F5FE',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    padding: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0E6F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9D2E8',
  },
  optionIcon: {
    fontSize: 18,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: '#251A34',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 3,
  },
  optionDetail: {
    color: '#8B7A9F',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '500',
  },
  secondaryButton: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#8F2AC3',
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#F0E6F8',
  },
  secondaryButtonText: {
    color: '#7421A8',
    fontWeight: '800',
    fontSize: 14,
  },
  sheetNote: {
    backgroundColor: '#F0E6F8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    padding: 14,
  },
  sheetNoteTitle: {
    color: '#251A34',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 6,
  },
  sheetNoteText: {
    color: '#8B7A9F',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  legalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#D9D2E8',
    maxHeight: '88%',
  },
  legalBrandWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  legalBrandBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7421A8',
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7DEF3',
  },
  legalBrandLogo: {
    width: '100%',
    height: '100%',
  },
  legalBrandText: {
    marginTop: 6,
    color: '#251A34',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  legalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  legalTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: '900',
    color: '#251A34',
    letterSpacing: -0.2,
  },
  legalScroll: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  legalSectionCard: {
    backgroundColor: '#F9F5FE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6DDF2',
    padding: 12,
  },
  legalSectionTitle: {
    color: '#5E1E90',
    fontWeight: '900',
    fontSize: 14,
    marginBottom: 8,
  },
  legalBody: {
    color: '#5A4A6F',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 8,
  },
  legalBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: 4,
  },
  legalBulletDot: {
    color: '#7A2AAF',
    fontSize: 16,
    lineHeight: 20,
    width: 14,
    fontWeight: '900',
  },
  legalBulletText: {
    flex: 1,
    color: '#5A4A6F',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  legalMeta: {
    marginBottom: 8,
    color: '#8B7A9F',
    fontSize: 12,
    fontWeight: '600',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#c6b8da',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8F2AC3',
  },
});