import badmintonImg from "../assets/badminton.png";

export default function Landing() {
  return (
    <div className="h-screen w-full max-w-[1920px] overflow-hidden bg-gradient-to-br from-white via-orange-50 to-white">
      {/* HEADER */}
      <header className="mx-auto flex w-full items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
          SportQ
        </h1>

        <button className="rounded-xl border border-primary/20 bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary hover:text-white cursor-pointer">
          Login
        </button>
      </header>

      {/* HERO */}
      <main className="mx-auto flex w-full flex-col items-center gap-14 px-5 py-10 sm:px-8 lg:flex-row lg:gap-10 lg:px-12 lg:py-16 overflow-hidden">
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
            queues, and connect with players around you — all in one modern
            platform.
          </p>

          {/* BUTTONS */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
            <button className="w-full rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:scale-[1.02] hover:bg-secondary sm:w-fit cursor-pointer">
              Get Started
            </button>

            <button className="w-full rounded-2xl border border-gray-300 bg-white px-8 py-4 text-sm font-semibold text-text transition hover:border-primary hover:text-primary sm:w-fit cursor-pointer">
              Learn More
            </button>
          </div>
        </section>

        {/* RIGHT */}
        <section className="relative flex flex-1 items-center justify-center">
          {/* BACKGROUND GLOW */}
          <div className="absolute h-[320px] w-[320px] rounded-full bg-primary/20 blur-3xl sm:h-[450px] sm:w-[450px]" />

          {/* IMAGE CARD */}
          <div className="relative w-full max-w-[620px] rounded-[32px] border border-white/50 bg-white/70 p-4 shadow-2xl backdrop-blur">
            <img
              src={badmintonImg}
              alt="Badminton players"
              className="block h-full w-full rounded-[24px] object-cover"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
