import React, { FC } from "react";
import { useForm } from "@formspree/react";
import {
  TiSocialFacebook,
  TiSocialLinkedin,
  TiSocialTwitter,
  TiSocialYoutube,
} from "react-icons/ti";
import { Heart, GaugeCircle } from "lucide-react";

export const Footer: FC = () => {
  const [state, handleSubmit] = useForm("xovjoqaj"); // [STORE IN .ENV]

  if (state.succeeded) {
    return (
      <h1 className="md:text-5xl/tight my-4 max-w-lg text-4xl font-medium text-fg">
        Thanks for sending your message!
      </h1>
    );
  }

  const menuOne = [
    "Support Center",
    "Customer Support",
    "About Us",
    "Project",
    "Return Policy",
  ];

  const menuTwo = ["Press Inquiries", "Social Media Support", "Site Map"];

  return (
    <footer className="bg-bg/40 backdrop-blur-3xl">
      <div className="container py-20 lg:px-20">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="col-span-2 sm:col-span-1 lg:col-span-3">
            <ul className="flex flex-col gap-3">
              <h5 className="text-muted mb2 font-medium lg:text-lg xl:text-xl">
                About Us
              </h5>
              {menuOne.map((item, index) => (
                <li key={index}>
                  <a
                    href="#"
                    className="text-muted text-base transition-all hover:text-fg"
                  >
                    <GaugeCircle className="me-2 inline-block h-4 w-4" />
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1 lg:col-span-3">
            <ul className="flex flex-col gap-3">
              <h5 className="text-muted mb2 font-medium lg:text-lg xl:text-xl">
                My Account
              </h5>
              {menuTwo.map((item, index) => (
                <li key={index}>
                  <a
                    href="#"
                    className="text-muted text-base transition-all hover:text-fg"
                  >
                    <GaugeCircle className="me-2 inline-block h-4 w-4" />
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-6">
            <div className="bg-primary/20 rounded-xl">
              <div className="p-10">
                <h6 className="mb-4 text-xl text-fg">Newsletter</h6>
                <p className="text-muted mb-6 text-base font-medium">
                  Singup and receive the latest tips
                </p>

                <form onSubmit={handleSubmit} className="mb-6 space-y-2">
                  <label htmlFor="email" className="text-base text-fg">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="bg-bg/60 pe-40 ps-4 h-12 w-full rounded-lg border-muted/10 py-4 text-fg backdrop-blur-3xl focus:border-muted/10 focus:ring-0"
                    />

                    <button
                      type="submit"
                      disabled={state.submitting}
                      className="hover:bg-primary-600 hover:border-primary-600 border-primary bg-primary end-[6px] absolute top-[6px] inline-flex h-9 items-center justify-center gap-2 rounded-md px-6 text-bg transition-all"
                    >
                      Subscribe
                    </button>
                  </div>
                </form>

                <div className="">
                  <h6 className="mb-4 text-base text-fg">Follow Us</h6>
                  <ul className="flex flex-wrap items-center gap-1">
                    {[
                      <TiSocialFacebook />,
                      <TiSocialLinkedin />,
                      <TiSocialYoutube />,
                      <TiSocialTwitter />,
                    ].map((social, index) => (
                      <li key={index}>
                        <a
                          href="#"
                          className="hover:bg-primary group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-muted/10 transition-all duration-500"
                        >
                          {social}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-muted/10 py-6">
        <div className="md:text-start container flex h-full flex-wrap items-center justify-center gap-4 text-center md:justify-between lg:px-20">
          <p className="text-muted text-base font-medium">
            @ SolanaAI -{" "}
            <a href="#">
              Design & Created{" "}
              <Heart className="inline h-4 w-4 fill-danger text-danger" />{" "}
              by @TheTed
            </a>
          </p>

          <p className="text-muted text-base font-medium">
            Terms Conditions & Policy
          </p>
        </div>
      </div>
    </footer>
  );
};
