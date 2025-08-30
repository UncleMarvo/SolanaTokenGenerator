import React, { FC } from "react";

interface InputViewProps {
  name: string;
  placeholder: string;
  clickhandle?: (e: any) => void;
}

export const InputView: FC<InputViewProps> = ({ placeholder, name, clickhandle }) => {
  return (
    <div className="mb-4">
      <label
        htmlFor="input-label"
        className="text-base/normal text-muted mb-2 block font-semibold"
      >
        {name}
      </label>

      <input
        type="text"
        id="input-label"
        onChange={clickhandle}
        placeholder={placeholder}
        className="border-muted block w-full rounded border-muted/10 bg-transparent py-1.5 px-3 text-fg/80 focus:border-muted/25 focus:ring-transparent"
      />
    </div>
  );
};
