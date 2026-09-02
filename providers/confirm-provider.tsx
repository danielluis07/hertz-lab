"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ConfirmState = {
  title: string;
  message: string;
  resolve: (value: boolean) => void;
} | null;

type ConfirmContextType = {
  confirm: (title: string, message: string) => Promise<boolean>;
  closeConfirm: () => void;
  setPending: (value: boolean) => void;
};

const ConfirmContext = createContext<ConfirmContextType>({
  confirm: () => Promise.resolve(false),
  closeConfirm: () => {},
  setPending: () => {},
});

export const ConfirmProvider = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isPending, setIsPending] = useState(false);

  const confirm = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ title, message, resolve });
      setIsPending(false);
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
    setIsPending(false);
  }, []);

  const setPending = useCallback((value: boolean) => {
    setIsPending(value);
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(true);
    }
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    confirmState?.resolve(false);
    setConfirmState(null);
    setIsPending(false);
  }, [confirmState]);

  return (
    <ConfirmContext.Provider value={{ confirm, closeConfirm, setPending }}>
      {children}
      {confirmState && (
        <Dialog open={true} onOpenChange={handleCancel}>
          <DialogContent className={cn(className, "font-admin")}>
            <DialogHeader>
              <DialogTitle className="font-admin">
                {confirmState.title}
              </DialogTitle>
              <DialogDescription className="font-admin">
                {confirmState.message}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-2">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isPending}
                className="font-admin">
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                variant="destructive"
                disabled={isPending}
                className="font-admin">
                {isPending ? <Spinner className="mx-7" /> : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);
