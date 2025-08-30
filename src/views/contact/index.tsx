import React, { FC } from "react";
import { useForm, ValidationError } from "@formspree/react";
import { AiOutlineClose } from "react-icons/ai";
import { notify } from "../../utils/notifications";

import { Branding } from "../../components/Branding";

interface ContactViewProps {
  setOpenContact: (value: boolean) => void;
}

export const ContactView: FC<ContactViewProps> = ({ setOpenContact }) => {
  const [state, handleSubmit] = useForm("xovjoqaj");
  if (state.succeeded) {
    notify({
      type: "success",
      message: "Thanks for submitting your message, we'll get back to you.",
    });
    setOpenContact(false);
  }

  // INTERNAL COMPONENT
  const CloseModal = () => (
    <a
      onClick={() => setOpenContact(false)}
      className="group mt-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted/20 backdrop-blur-2xl transition-all duration-500 hover:bg-secondary-600/60"
    >
      <i className="text-2xl text-fg group-hover:text-fg">
        <AiOutlineClose />
      </i>
    </a>
  );

  return (
    <>
      <section className="flex w-full items-center py-6 px-0 lg:h-screen lg:p-10">
        <div className="container">
          <div className="bg-bg/40 mx-auto max-w-5xl overflow-hidden backdrop-blur-2xl  modal-grid">
            <div className="grid gap-10 lg:grid-cols-2">
              {/* FIRST */}
              <Branding
                image="auth-img"
                title="To build your Solana token creator"
                message="Try and create your first ever Solana project"
              />

              {/* SECOND */}
              <div className="lg:ps-0 flex h-full flex-col p-10">
                <div className="pb-10">
                  <a className="flex">
                    <img
                      src="assets/images/logo1.png"
                      alt="logo"
                      className="h-10"
                    />
                  </a>
                </div>

                <div className="my-auto pb-6 text-center">
                  <h4 className="mb-4 text-2xl font-bold text-fg">
                    Send email to us for more details
                  </h4>
                  <p className="text-muted mx-auto mb-5 max-w-sm">
                    Send your message so we can provide you with more details
                  </p>

                  <div className="text-start">
                    <form onSubmit={handleSubmit}>
                      <div className="mb-4">
                        <label
                          htmlFor="email"
                          className="text-base/normal text-muted mb-2 block font-semibold"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          placeholder="email"
                          className="border-muted block w-full rounded border-muted/10 bg-transparent py-1.5 px-3 text-fg/80 focus:border-muted/25 focus:ring-transparent"
                        />
                      </div>
                      <ValidationError
                        prefix="Email"
                        field="email"
                        errors={state.errors}
                      />

                      <textarea
                        name="message"
                        id="message"
                        rows={6}
                        placeholder="message"
                        className="border-muted relative block w-full rounded border-muted/10 bg-transparent py-1.5 px-3 text-fg/80 focus:border-muted/25 focus:ring-transparent"
                      ></textarea>
                      <ValidationError
                        prefix="Message"
                        field="message"
                        errors={state.errors}
                      />

                      <div className="mb-6 text-center">
                        <button
                          type="submit"
                          disabled={state.submitting}
                          className="bg-primary-600/90 hover:bg-primary-600 group mt-5 inline-flex w-full items-center justify-center rounded-lg px-6 py-2 text-bg backdrop-blur-2xl transition-all duration-500"
                        >
                          <span className="fw-bold">Send Message</span>
                        </button>

                        <CloseModal />
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
