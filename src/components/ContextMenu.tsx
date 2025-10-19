import { useEffect, useRef } from "react";

export interface MenuItem {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    separator?: boolean;
}

export interface ContextMenuProps {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    useEffect(() => {
        // Adjust position if menu goes off screen
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            if (rect.right > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 10;
            }

            if (rect.bottom > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 10;
            }

            menuRef.current.style.left = `${adjustedX}px`;
            menuRef.current.style.top = `${adjustedY}px`;
        }
    }, [x, y]);

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{
                position: "fixed",
                left: `${x}px`,
                top: `${y}px`,
                zIndex: 1000
            }}
        >
            <ul className="context-menu__list">
                {items.map((item, index) => {
                    if (item.separator) {
                        return <li key={index} className="context-menu__separator" />;
                    }

                    return (
                        <li key={index}>
                            <button
                                type="button"
                                className="context-menu__item"
                                onClick={() => {
                                    item.onClick();
                                    onClose();
                                }}
                                disabled={item.disabled}
                            >
                                {item.label}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
