import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import badmintonImg from "../assets/badminton.png";
import img2 from "../assets/300b83676693906ceea86a960b3425c8.jpg";
import img3 from "../assets/b002681a02d8555674159b7c4480d938.jpg";

const images = [badmintonImg, img2, img3];

export default function Landing() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full max-w-[1920px] flex-col overflow-hidden bg-gradient-to-br from-white via-orange-50 to-white">
      {/* HEADER */}
      <header className="mx-auto flex w-full items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
          SportQ
        </h1>
      </header>

      {/* HERO (CENTERED) */}
      <main className="flex flex-1 items-center justify-center px-5 sm:px-8 lg:px-12">
        <div className="flex w-full flex-col items-center gap-14 lg:flex-row lg:gap-10">
          {/* LEFT */}
          <section className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              🏸 Your Sports Matchmaking Platform
            </div>

            <h2 className="mt-6 text-5xl font-black leading-tight tracking-tight text-text sm:text-6xl md:text-7xl">
              Find Games.
              <br />
              Build Teams.
              <br />
              <span className="text-primary">Play More.</span>
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg lg:mx-0">
              Join local sports communities, host badminton matches, organize
              queues, and connect with players around you.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
              <NavLink
                to="/login"
                className="w-full cursor-pointer rounded-2xl bg-primary px-8 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:scale-[1.02] hover:bg-secondary sm:w-fit"
              >
                Get Started
              </NavLink>
            </div>
          </section>

          {/* RIGHT (SLIDER) */}
          <section className="relative flex flex-1 items-center justify-center">
            {/* glow */}
            <div className="absolute h-[320px] w-[320px] rounded-full bg-primary/20 blur-3xl sm:h-[450px] sm:w-[450px]" />

            {/* image frame (smaller height) */}
            <div className="relative w-full max-w-[620px] overflow-hidden rounded-[32px] border border-white/50 bg-white/70 p-4 shadow-2xl backdrop-blur h-[240px] sm:h-[300px] lg:h-[740px]">
              <div
                className="flex h-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${index * 100}%)` }}
              >
                {images.map((img, i) => (
                  <div key={i} className="h-full w-full flex-shrink-0">
                    <img
                      src={img}
                      alt={`slide-${i}`}
                      className="h-full w-full rounded-[24px] object-cover object-center"
                    />
                  </div>
                ))}
              </div>

              {/* dots */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full transition ${
                      i === index ? "bg-primary" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
