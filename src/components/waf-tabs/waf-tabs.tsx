import { Component, State, Element } from '@stencil/core';

interface SingleTabModel {
    tabID:string,
    tabContent:string,
    tabPaneID:string,
    isSelected:boolean
};
interface TabModel extends Array<SingleTabModel> {};

@Component({
  tag: 'waf-tabs',
  styleUrl: 'waf-tabs.scss'
})
export class WafTabs {
    private uniqueId:number = Date.now();
    private slottedElt:Element;
    private slotHTMLLiveHTMLCollection:HTMLCollection;
    private slotMutationObserver:MutationObserver;
    private observerConfig:MutationObserverInit = { childList: true };
    @Element() wafTabsElt:HTMLElement;
    @State() model:TabModel = [];

    render() {
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

        return [tabsRenderer(), <div class="waf-tabs__tabpanel-container"><slot /></div>];
    }

    componentDidLoad() {
        // slot
        this.slottedElt = this.wafTabsElt.querySelector('.waf-tabs__tabpanel-container');

        // is live up-to-date
        this.slotHTMLLiveHTMLCollection = this.slottedElt.children;

        // mutation observer to detect changes
        this.slotMutationObserver = new MutationObserver(this.mutationsHandler.bind(this));
        this.slotMutationObserver.observe(this.slottedElt, this.observerConfig);

        // initial model creation
        this.mutationsHandler();
    }

    componentDidUnload() {
        // disconnect mutation observer
        this.slotMutationObserver.disconnect();
    }

    idGenerator(type:'tab'|'tabpane', index) { return `${type}-${this.uniqueId}-${index}` }
    spreadAttributesTab(tabInfo:SingleTabModel) { return { 'id': tabInfo.tabID, 'aria-controls': tabInfo.tabPaneID, 'aria-selected': tabInfo.isSelected, 'innerHTML': tabInfo.tabContent } }
    spreadAttributesTabPane(tabInfo:SingleTabModel) { return { 'id': tabInfo.tabPaneID, 'aria-labelledby': tabInfo.tabID, 'aria-hidden': String(!tabInfo.isSelected), 'selected': String(tabInfo.isSelected) } }

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

            // update in slotted elements (out of VDOM)
            const wafTabs:Element[] = Array.from(this.slotHTMLLiveHTMLCollection);
            wafTabs.forEach((elt, index) => {
                elt.setAttribute('aria-hidden', (index === tabIndexSelected) ? 'false' : 'true');
                elt.setAttribute('selected', (index === tabIndexSelected).toString());
            });
        }
    }

    mutationsHandler() {
        const newModel:TabModel = [];
        const wafTabs:Element[] = Array.from(this.slotHTMLLiveHTMLCollection);
        wafTabs.forEach((elt, index) => {
            // check if valid waf-tab tag
            if (elt.nodeName !== 'WAF-TAB') {
                console.warn('waf-tabs | this tag should only contain "waf-tab" tags', elt.nodeName);
                return;
            }

            // get tab pane data
            const humanReadableIndex = index + 1;
            const tabContentTxt = elt.getAttribute('tab-header');
            const isSelectedAtr = elt.getAttribute('selected');

            // build entry
            const modelEntry:SingleTabModel = {
                tabID: this.idGenerator('tab', humanReadableIndex),
                tabContent: (tabContentTxt) ? tabContentTxt : '',
                tabPaneID: this.idGenerator('tabpane', humanReadableIndex),
                isSelected: (isSelectedAtr === '' || isSelectedAtr === 'true') // boolean attribute
            }

            // update tab panes (out of VDOM)
            const tabPaneAttributes = this.spreadAttributesTabPane(modelEntry);
            Object.keys(tabPaneAttributes).forEach(attributeName => {
                elt.setAttribute(attributeName, tabPaneAttributes[attributeName]);
            });

            // push to state
            newModel.push(modelEntry);
        });       

        // apply to component state
        this.model = newModel;
    }
}