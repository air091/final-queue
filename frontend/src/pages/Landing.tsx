import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import img2 from "../assets/300b83676693906ceea86a960b3425c8.jpg";
import img3 from "../assets/b002681a02d8555674159b7c4480d938.jpg";

import usImg1 from "../assets/logo.jpg";
import usImg2 from "../assets/image_01.jpg";
import usImg3 from "../assets/image_02.jpg";
import usImg4 from "../assets/image_03.jpg";

import { useAuth } from "../hooks/useAuth";

const images = [img2, img3];
const aboutImages = [usImg1, usImg2, usImg3, usImg4];

export default function Landing() {
  const [index, setIndex] = useState(0);
  const [aboutIndex, setAboutIndex] = useState(0);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAboutIndex((prev) => (prev + 1) % aboutImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    if (isLoading) return;

    navigate(user ? "/home" : "/login");
  };

  return (
    <div className="flex min-h-screen w-full max-w-[1920px] flex-col overflow-x-hidden bg-gradient-to-br from-white via-orange-50 to-white">
      {/* HEADER */}
      <header className="mx-auto flex w-full items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
          Queue<span className="text-primary">Tato</span> Sports Management
        </h1>
      </header>

      {/* HERO */}
      <main className="flex flex-1 flex-col">
        <section className="flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex w-full flex-col items-center gap-14 lg:flex-row lg:gap-10">
            {/* LEFT */}
            <section className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                Your Sports Matchmaking Platform
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
                <button
                  type="button"
                  onClick={handleGetStarted}
                  disabled={isLoading}
                  className="w-full cursor-pointer rounded-2xl bg-primary px-8 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:scale-[1.02] hover:bg-secondary disabled:cursor-wait disabled:opacity-70 sm:w-fit"
                >
                  {isLoading ? "Checking..." : "Get Started"}
                </button>
              </div>
            </section>

            {/* RIGHT (SLIDER) */}
            <section className="relative flex flex-1 items-center justify-center">
              {/* background glow */}
              <div className="absolute h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />

              {/* floating glass background */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-[88%] w-[88%] rounded-[40px] border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-3xl" />
              </div>

              {/* modern slider */}
              <div className="relative h-[260px] w-full max-w-[680px] overflow-hidden rounded-[40px] border border-white/20 bg-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.15)] backdrop-blur-2xl sm:h-[360px] lg:h-[760px]">
                {/* slider */}
                <div
                  className="flex h-full w-full transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    width: `${images.length * 100}%`,
                    transform: `translateX(-${index * (100 / images.length)}%)`,
                  }}
                >
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative h-full flex-shrink-0"
                      style={{
                        width: `${100 / images.length}%`,
                      }}
                    >
                      {/* image */}
                      <img
                        src={img}
                        alt={`slide-${i}`}
                        className="h-full w-full object-cover object-center"
                      />

                      {/* dark overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </div>
                  ))}
                </div>

                {/* modern dots */}
                <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-xl">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className={`rounded-full transition-all duration-500 ${
                        i === index
                          ? "h-2.5 w-8 bg-white"
                          : "h-2.5 w-2.5 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* ABOUT US */}
        <section className="px-5 py-50 sm:px-8 lg:px-12">
          <div className="mx-auto grid gap-14 lg:grid-cols-2 lg:items-center">
            {/* LEFT */}
            <div className="relative flex items-center justify-center">
              {/* background glow */}
              <div className="absolute h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />

              {/* floating gradient ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-[88%] w-[88%] rounded-[40px] border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-3xl" />
              </div>

              {/* modern slider container */}
              <div className="relative h-[360px] w-full max-w-[620px] overflow-hidden rounded-[40px] border border-white/30 bg-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.15)] backdrop-blur-2xl sm:h-[480px]">
                {/* slider */}
                <div
                  className="flex h-full w-full transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    width: `${aboutImages.length * 100}%`,
                    transform: `translateX(-${
                      aboutIndex * (100 / aboutImages.length)
                    }%)`,
                  }}
                >
                  {aboutImages.map((img, i) => (
                    <div
                      key={i}
                      className="relative h-full flex-shrink-0"
                      style={{
                        width: `${100 / aboutImages.length}%`,
                      }}
                    >
                      {/* image */}
                      <img
                        src={img}
                        alt={`about-slide-${i}`}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                  ))}
                </div>
                {/* modern dots */}
                <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-xl">
                  {aboutImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setAboutIndex(i)}
                      className={`rounded-full transition-all duration-500 ${
                        i === aboutIndex
                          ? "h-2.5 w-8 bg-white"
                          : "h-2.5 w-2.5 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <section className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                About Us
              </div>

              <h2 className="mt-6 text-5xl font-black leading-tight tracking-tight text-text sm:text-6xl md:text-7xl">
                Smashed <span className="text-primary">Potato</span> Badminton
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg lg:mx-0">
                The friendliest, happiest, smashiest Badminton club is here! Be
                a proud patatas today!
              </p>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg lg:mx-0">
                We are a group of Badminton player-enthusiasts looking for
                friendly and competitive players. This group is created to
                promote camaraderie and sports. Tara, Palo!
              </p>

              {/* socials + actions */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/smashedpotatobadminton"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-[#1877F2] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/30"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.88 3.77-3.88 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
                  </svg>

                  <span>Facebook</span>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/smashedpotatoph/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl px-6 py-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* animated gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 opacity-100 transition-all duration-500 group-hover:scale-110" />

                  {/* glass overlay for better readability */}
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />

                  {/* content */}
                  <div className="relative flex items-center gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path d="M7.75 2C4.57 2 2 4.57 2 7.75v8.5C2 19.43 4.57 22 7.75 22h8.5C19.43 22 22 19.43 22 16.25v-8.5C22 4.57 19.43 2 16.25 2h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-3a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
                    </svg>

                    <span>Instagram</span>
                  </div>
                </a>

                {/* Community */}
                <a
                  href="https://www.facebook.com/groups/741059841219345/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 rounded-2xl border border-primary/10 bg-transparent px-6 py-4 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/30 hover:bg-primary hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4Zm-8 1c-2.33 0-7 1.17-7 3.5V19h7v-1c0-1.17.43-2.22 1.22-3.07A13.16 13.16 0 0 0 8 14Z" />
                  </svg>

                  <span>Join our badminton community</span>
                </a>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
