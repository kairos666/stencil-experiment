import { Component, State } from '@stencil/core';

// declare model interface
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
    @State() model:TabModel = [
        { tabID: this.idGenerator('tab', 1), tabContent: 'Tab A', tabPaneID: this.idGenerator('tabpane', 1), isSelected: true, tabPaneContent: `<p>Tu vois, là on voit qu'on a beaucoup à travailler sur nous-mêmes car il faut toute la splendeur du aware car l'aboutissement de l'instinct, c'est l'amour ! Et là, vraiment, j'essaie de tout coeur de donner la plus belle réponse de la terre !</p>` },
        { tabID: this.idGenerator('tab', 2), tabContent: 'Tab B', tabPaneID: this.idGenerator('tabpane', 2), isSelected: false, tabPaneContent: `<p>Je ne voudrais pas rentrer dans des choses trop dimensionnelles, mais, si vraiment tu veux te rappeler des souvenirs de ton perroquet, on vit dans une réalité qu'on a créée et que j'appelle illusion parce que spirituellement, on est tous ensemble, ok ? C'est cette année que j'ai eu la révélation !</p>` },
        { tabID: this.idGenerator('tab', 3), tabContent: 'Tab C', tabPaneID: this.idGenerator('tabpane', 3), isSelected: false, tabPaneContent: `<p>Si je t'emmerde, tu me le dis, je sais que, grâce à ma propre vérité le cycle du cosmos dans la vie... c'est une grande roue car l'aboutissement de l'instinct, c'est l'amour ! C'est cette année que j'ai eu la révélation !</p>` }
    ];

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

        const tabPanesRenderer = () => {
            return this.model.map(tabInfo =>
                <section class="waf-tabs__tabpanel" {...this.spreadAttributesTabPane(tabInfo)} role="tabpanel"></section>
            )
        }

        return [tabsRenderer(), ...tabPanesRenderer()];
    }

    idGenerator(type:'tab'|'tabpane', index) { return `${type}-${this.uniqueId}-${index}` }
    spreadAttributesTab(tabInfo:SingleTabModel) { return { 'id': tabInfo.tabID, 'aria-controls': tabInfo.tabPaneID, 'aria-selected': tabInfo.isSelected, 'innerHTML': tabInfo.tabContent } }
    spreadAttributesTabPane(tabInfo:SingleTabModel) { return { 'id': tabInfo.tabPaneID, 'aria-labelledby': tabInfo.tabID, 'aria-hidden': !tabInfo.isSelected, 'innerHTML': tabInfo.tabPaneContent } }

    onTabSelected(tabIndexSelected:number, evt?:KeyboardEvent) {
        // is it keyboard driven event and continue on return (13), left arrow (37), right arrow (39) TODO make it work with focus changes http://accessibility.athena-ict.com/aria/examples/tabpanel2.shtml
        if (evt) {
            switch (evt.which) {
                case 13: /* do nothing - let pass through */ break;
                case 37:
                    const updatedLesserIndex = tabIndexSelected - 1;
                    tabIndexSelected = Math.max(updatedLesserIndex, 0);
                break;
                case 38:
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
}