import React, { FC } from "react";

interface BrandingProps {
  image: string;
  title: string;
  message: string;
}

export const Branding: FC<BrandingProps> = ({ image, title, message }) => {
  return (
    <div className="ps-4 hidden py-4 lg:block">
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        <img
          src={`assets/images/ai/${image}.jpg`}
          alt=""
          className="h-full w-full -scale-x-100 transform"
        />

        <div className="bg-bg/40 absolute inset-0">
          <div className="flex h-full items-end justify-center">
            <div className="text-start p-6">
              <h5 className="mb-3 text-xl font-bold text-fg">
                Solana Token Creator
                <br/>
                {title}
              </h5>
              <p className="text-muted text-base font-medium">
                {message}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
