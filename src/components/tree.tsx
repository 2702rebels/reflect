import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronRight } from "lucide-react";
import { useCallback } from "react";

import { cn } from "../lib/utils";
import { ScrollArea } from "./scroll-area";

import type { RequiredProperty } from "../lib/utils";

export interface TreeNodeMetadata<T> {
  /** Tree node identifier. */
  id: string;
  /** Tree node display content. */
  content: React.ReactNode;
  /** Expanded state. */
  expanded?: boolean;
  /** Child nodes. */
  children?: ReadonlyArray<T>;
}

export type TreeProps<T> = {
  /** Tree data: a root node representation or an array of root nodes. */
  data: ReadonlyArray<T> | T;
  /** Render function for the tree node content */
  renderNode?: (node: T, metadata: TreeNodeMetadata<T>) => React.ReactNode;
  /** Function that returns tree node metadata. */
  metadata: (node: T) => TreeNodeMetadata<T>;
  /** Callback invoked when the node is selected. */
  onSelectionChange?: (node: T | undefined) => void;
  /** Identifier of the selected node. */
  selectedId?: string | null;
  /** CSS class overrides. */
  className?: string;
};

/** A tree component with expandable items. */
export const Tree = <T,>({ data, renderNode, metadata, onSelectionChange, selectedId, className }: TreeProps<T>) => {
  const handleSelection = useCallback(
    (node: T | undefined) => {
      if (onSelectionChange) {
        onSelectionChange(node);
      }
    },
    [onSelectionChange]
  );

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="relative">
        <TreeItem<T>
          data={data}
          renderNode={renderNode}
          metadata={metadata}
          onSelectionChange={handleSelection}
          selectedId={selectedId}
        />
      </div>
    </ScrollArea>
  );
};

Tree.displayName = "Tree";

type TreeItemProps<T> = React.ComponentProps<"ul"> &
  RequiredProperty<
    Pick<TreeProps<T>, "data" | "renderNode" | "metadata" | "onSelectionChange" | "selectedId">,
    "onSelectionChange"
  >;

const TreeItem = <T,>({
  data,
  renderNode,
  metadata,
  onSelectionChange,
  selectedId,
  className,
  ...props
}: TreeItemProps<T>) => (
  <ul
    className={className}
    {...props}>
    {(data instanceof Array ? data : [data]).map((node) => {
      const d = metadata(node);
      return (
        <li key={d.id}>
          {d.children && d.children.length > 0 ? (
            <AccordionPrimitive.Root
              type="single"
              collapsible
              >
              <AccordionPrimitive.Item value={d.id}>
                <AccordionTrigger
                  className="p-2 before:absolute before:left-0 before:-z-10 before:h-9 before:w-full before:bg-muted/80 before:opacity-0 hover:before:opacity-100 data-[selected='true']:text-accent-foreground data-[selected='true']:before:border-l-2 data-[selected='true']:before:border-l-accent-foreground/60 data-[selected='true']:before:bg-accent/80 data-[selected='true']:before:opacity-100"
                  data-selected={selectedId === d.id}
                  onClick={() => onSelectionChange(node)}>
                  {renderNode ? renderNode(node, d) : <span className="truncate text-sm">{d.content}</span>}
                </AccordionTrigger>
                <AccordionContent className="pl-5">
                  <TreeItem
                    data={d.children}
                    renderNode={renderNode}
                    metadata={metadata}
                    selectedId={selectedId}
                    onSelectionChange={onSelectionChange}
                  />
                </AccordionContent>
              </AccordionPrimitive.Item>
            </AccordionPrimitive.Root>
          ) : (
            <div
              className="flex cursor-pointer items-center p-2 before:absolute before:left-0 before:-z-10 before:h-9 before:w-full before:bg-muted/80 before:opacity-0 focus-within:ring-1 focus-within:ring-ring focus-within:ring-inset hover:before:opacity-100 focus:outline-hidden data-[selected='true']:text-accent-foreground data-[selected='true']:before:border-l-2 data-[selected='true']:before:border-l-accent-foreground/60 data-[selected='true']:before:bg-accent/80 data-[selected='true']:before:opacity-100"
              data-selected={selectedId === d.id}
              onClick={() => onSelectionChange(node)}>
              {renderNode ? renderNode(node, d) : <span className="grow truncate text-sm">{d.content}</span>}
            </div>
          )}
        </li>
      );
    })}
  </ul>
);

TreeItem.displayName = "TreeItem";

const AccordionTrigger = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      className={cn(
        "flex w-full flex-1 items-center gap-1 focus-within:ring-1 focus-within:ring-ring focus-within:ring-inset focus:outline-hidden [&[data-state=open]>svg]:first:rotate-90",
        className
      )}
      {...props}>
      <ChevronRight className="mr-auto size-4 shrink-0 text-accent-foreground/50 transition-transform duration-200" />
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);

AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) => (
  <AccordionPrimitive.Content
    className={cn(
      "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className
    )}
    {...props}>
    <div>{children}</div>
  </AccordionPrimitive.Content>
);

AccordionContent.displayName = AccordionPrimitive.Content.displayName;
