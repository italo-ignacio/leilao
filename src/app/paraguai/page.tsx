import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, MapPin, Plane } from "lucide-react";
import { TripCountdown } from "./trip-countdown";
import "./trip.css";

export const metadata: Metadata = {
  title: { absolute: "Paraguai | 13 de dezembro de 2026" },
  description:
    "Contagem regressiva para a viagem ao Paraguai em 13 de dezembro de 2026.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Paraguai | 13 de dezembro de 2026",
    description: "A próxima viagem já tem data marcada.",
    siteName: "Viagem ao Paraguai",
  },
};

export default function ParaguayPage() {
  return (
    <main className="paraguay-trip">
      <section className="hero" aria-labelledby="destination-title">
        <Image
          unoptimized
          fill
          priority
          sizes="100vw"
          src="https://commons.wikimedia.org/wiki/Special:FilePath/Costanera_Asunci%C3%B3n.png?width=1920"
          alt="Vista da orla de Assunção, no Paraguai"
          className="landscape"
        />
        <div className="shade" />
        <div className="heroContent">
          <header className="header">
            <span className="wordmark">
              <span className="brandIcon">
                <Plane aria-hidden="true" size={20} />
              </span>{" "}
              Fora da rotina.
            </span>
            <span className="year">UMA VIAGEM PARA CONTAR</span>
          </header>
          <div className="destination">
            <p className="eyebrow">
              <span className="flagMark" aria-hidden="true" /> PRÓXIMA PARADA
            </p>
            <h1 id="destination-title">
              Paraguai<span className="period">.</span>
            </h1>
            <p className="subtitle">A melhor parte ainda está por vir.</p>
            <p className="date">
              <CalendarDays size={16} aria-hidden="true" />
              <time dateTime="2026-12-13">13 de dezembro de 2026</time>
              <span className="dateSeparator">/</span>Domingo
            </p>
          </div>
          <div className="heroBottom">
            <span>
              <MapPin size={14} aria-hidden="true" /> América do Sul · Paraguai
            </span>
            <span>25°16′ S · 57°38′ O</span>
          </div>
        </div>
      </section>
      <div className="content">
        <section
          aria-label="Contagem regressiva da viagem"
          className="departure"
        >
          <div className="departureHeading">
            <span className="eyebrow">O PRÓXIMO CAPÍTULO</span>
            <p>
              Já dá para sentir
              <br />o frio na barriga.
            </p>
            <span className="smallDate">
              13.12.2026 <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </div>
          <TripCountdown />
        </section>
        <footer className="footer">
          <span>Malas quase prontas. Memórias por fazer.</span>
          <span className="footerDetails">
            <span>13/12 · 00h · Brasília</span>
            <a
              href="https://commons.wikimedia.org/wiki/File:Costanera_Asunci%C3%B3n.png"
              target="_blank"
              rel="noreferrer"
            >
              Foto: Wikimedia <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </span>
        </footer>
      </div>
    </main>
  );
}
