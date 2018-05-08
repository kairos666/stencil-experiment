import { Component, State, Element } from '@stencil/core';

interface SingleTabModel {
    tabID:string,
    tabContent:string,
    tabPaneID:string,
    tabPaneContent:string,
    isSelected:boolean
};
interface TabModel extends Array<SingleTabModel> {};

@Component({
  tag: 'waf-tabs',
  styleUrl: 'waf-tabs.scss'
})
export class WafTabs {
    private uniqueId:number = Date.now();
    private slotHTMLLiveHTMLCollection:HTMLCollection;
    private slotMutationObserver:MutationObserver;
    @Element() wafTabsElt:HTMLElement;
    @State() model:TabModel = [];

    render() {
        const slotRenderer = () => {
            return (
                <div class="waf-tabs__slot" aria-hidden="true">
                    <slot />
                </div>
            )
        }

        const tabsRenderer = () => {
            return (
                <nav class="waf-tabs__nav">
                    <ol role="tablist">
                        {this.model.map((tabInfo, index) =>
                            <li {...this.spreadAttributesTab(tabInfo)} role="tab" tabindex="0" onClick={() => { this.onTabSelected(index) }} onKeyDown={evt => { this.onTabSelected(index, evt) }}></li>
                        )}
                    </ol>
                </nav>
            );
        }

        const tabPanesRenderer = () => {
            return this.model.map(tabInfo =>
                <section class="waf-tabs__tabpanel" {...this.spreadAttributesTabPane(tabInfo)} role="tabpanel"></section>
            )
        }

        return [tabsRenderer(), ...tabPanesRenderer(), slotRenderer()];
    }

    componentDidLoad() {
        // slot
        const slotElt = this.wafTabsElt.querySelector('.waf-tabs__slot');

        // is live up-to-date
        this.slotHTMLLiveHTMLCollection = slotElt.children;

        // mutation observer to detect changes
        this.slotMutationObserver = new MutationObserver(this.mutationsHandler.bind(this));
        this.slotMutationObserver.observe(slotElt, { attributes: true, childList: true, characterData: true, subtree: true });

        // initial model creation
        this.mutationsHandler();
    }

    componentDidUnload() {
        // disconnect mutation observer
        this.slotMutationObserver.disconnect();
    }

    idGenerator(type:'tab'|'tabpane', index) { return `${type}-${this.uniqueId}-${index}` }
    spreadAttributesTab(tabInfo:SingleTabModel) { return { 'id': tabInfo.tabID, 'aria-controls': tabInfo.tabPaneID, 'aria-selected': tabInfo.isSelected, 'innerHTML': tabInfo.tabContent } }
    spreadAttributesTabPane(tabInfo:SingleTabModel) { return { 'id': tabInfo.tabPaneID, 'aria-labelledby': tabInfo.tabID, 'aria-hidden': !tabInfo.isSelected, 'innerHTML': tabInfo.tabPaneContent } }

    onTabSelected(tabIndexSelected:number, evt?:KeyboardEvent) {
        // utility function that switch focus if possible and return true|false depending on action feasability
        const shiftFocus = function(target:Element, shiftDirection:'previous'|'next'):boolean {
            const newTarget = target[shiftDirection + 'ElementSibling'];
            if (newTarget) {
                // bring focus to new target
                (newTarget as HTMLElement).focus();
                return true;
            } else {
                // exit (no previous tab)
                return false;
            }
        }

        // is it keyboard driven event and continue on return (13), left arrow (37), right arrow (39) TODO make it work with focus changes http://accessibility.athena-ict.com/aria/examples/tabpanel2.shtml
        if (evt) {
            switch (evt.which) {
                case 13: /* do nothing - let pass through */ break;
                case 37:
                    if (!shiftFocus((evt.target as Element), 'previous')) return;
                    const updatedLesserIndex = tabIndexSelected - 1;
                    tabIndexSelected = Math.max(updatedLesserIndex, 0);
                break;
                case 39:
                    if (!shiftFocus((evt.target as Element), 'next')) return;
                    const updatedHigherIndex = tabIndexSelected + 1;
                    const tabCount = this.model.length - 1;
                    tabIndexSelected = Math.min(updatedHigherIndex, tabCount);
                break;
                default:
                    return;
            }
        }

        // operate update
        const currentlySelectedIndex = this.model.findIndex(tab => tab.isSelected);
        if (tabIndexSelected !== currentlySelectedIndex) {
            // only act on model if selected tab is changed
            this.model = this.model.map((item, index) => {
                item.isSelected = (tabIndexSelected === index);
                return item;
            });
        }
    }

    mutationsHandler() {
        const newModel:TabModel = [];
        const wafTabs:Element[] = Array.from(this.slotHTMLLiveHTMLCollection);
        wafTabs.forEach((elt, index) => {
            const humanReadableIndex = index + 1;
            const tabContentTxt = elt.querySelector('[slot="tab"]').innerHTML;
            const tabPaneContentTxt = elt.querySelector('[slot="tabpane"]').innerHTML;
            const isSelectedAtr = elt.getAttribute('selected');

            // build entry
            const modelEntry:SingleTabModel = {
                tabID: this.idGenerator('tab', humanReadableIndex),
                tabContent: (tabContentTxt) ? tabContentTxt : '',
                tabPaneID: this.idGenerator('tabpane', humanReadableIndex),
                tabPaneContent: (tabPaneContentTxt) ? tabPaneContentTxt : '',
                isSelected: (isSelectedAtr === '') // boolean attribute
            }

            // push to state
            newModel.push(modelEntry);
        });

        // if no tab was selected, by default select the first one
        if (newModel.length >= 1 && !newModel.find(tabModel => tabModel.isSelected)) newModel[0].isSelected = true;

        // apply to component state
        this.model = newModel;
    }
}